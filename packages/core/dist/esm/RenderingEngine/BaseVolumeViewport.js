import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkColorMaps from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction/ColorMaps';
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';
import cache from '../cache';
import { MPR_CAMERA_VALUES, RENDERING_DEFAULTS, VIEWPORT_PRESETS, } from '../constants';
import { Events, ViewportStatus, VOILUTFunctionType, } from '../enums';
import ViewportType from '../enums/ViewportType';
import eventTarget from '../eventTarget';
import { getShouldUseCPURendering } from '../init';
import { loadVolume } from '../loaders/volumeLoader';
import { actorIsA, applyPreset, createSigmoidRGBTransferFunction, getVoiFromSigmoidRGBTransferFunction, imageIdToURI, invertRgbTransferFunction, triggerEvent, colormap as colormapUtils, } from '../utilities';
import { createVolumeActor } from './helpers';
import volumeNewImageEventDispatcher, { resetVolumeNewImageState, } from './helpers/volumeNewImageEventDispatcher';
import Viewport from './Viewport';
import vtkSlabCamera from './vtkClasses/vtkSlabCamera';
import transformWorldToIndex from '../utilities/transformWorldToIndex';
class BaseVolumeViewport extends Viewport {
    constructor(props) {
        super(props);
        this.useCPURendering = false;
        this.use16BitTexture = false;
        this.inverted = false;
        this.getProperties = () => {
            const voiRanges = this.getActors()
                .map((actorEntry) => {
                const volumeActor = actorEntry.actor;
                const volumeId = actorEntry.uid;
                const volume = cache.getVolume(volumeId);
                if (!volume)
                    return null;
                const cfun = volumeActor.getProperty().getRGBTransferFunction(0);
                const [lower, upper] = this.VOILUTFunction === 'SIGMOID'
                    ? getVoiFromSigmoidRGBTransferFunction(cfun)
                    : cfun.getRange();
                return { volumeId, voiRange: { lower, upper } };
            })
                .filter(Boolean);
            const voiRange = voiRanges.length ? voiRanges[0].voiRange : null;
            const VOILUTFunction = this.VOILUTFunction;
            return { voiRange, VOILUTFunction, invert: this.inverted };
        };
        this.getFrameOfReferenceUID = () => {
            return this._FrameOfReferenceUID;
        };
        this.canvasToWorld = (canvasPos) => {
            const vtkCamera = this.getVtkActiveCamera();
            vtkCamera.setIsPerformingCoordinateTransformation?.(true);
            const renderer = this.getRenderer();
            const offscreenMultiRenderWindow = this.getRenderingEngine().offscreenMultiRenderWindow;
            const openGLRenderWindow = offscreenMultiRenderWindow.getOpenGLRenderWindow();
            const size = openGLRenderWindow.getSize();
            const devicePixelRatio = window.devicePixelRatio || 1;
            const canvasPosWithDPR = [
                canvasPos[0] * devicePixelRatio,
                canvasPos[1] * devicePixelRatio,
            ];
            const displayCoord = [
                canvasPosWithDPR[0] + this.sx,
                canvasPosWithDPR[1] + this.sy,
            ];
            displayCoord[1] = size[1] - displayCoord[1];
            const worldCoord = openGLRenderWindow.displayToWorld(displayCoord[0], displayCoord[1], 0, renderer);
            vtkCamera.setIsPerformingCoordinateTransformation?.(false);
            return [worldCoord[0], worldCoord[1], worldCoord[2]];
        };
        this.worldToCanvas = (worldPos) => {
            const vtkCamera = this.getVtkActiveCamera();
            vtkCamera.setIsPerformingCoordinateTransformation?.(true);
            const renderer = this.getRenderer();
            const offscreenMultiRenderWindow = this.getRenderingEngine().offscreenMultiRenderWindow;
            const openGLRenderWindow = offscreenMultiRenderWindow.getOpenGLRenderWindow();
            const size = openGLRenderWindow.getSize();
            const displayCoord = openGLRenderWindow.worldToDisplay(...worldPos, renderer);
            displayCoord[1] = size[1] - displayCoord[1];
            const canvasCoord = [
                displayCoord[0] - this.sx,
                displayCoord[1] - this.sy,
            ];
            const devicePixelRatio = window.devicePixelRatio || 1;
            const canvasCoordWithDPR = [
                canvasCoord[0] / devicePixelRatio,
                canvasCoord[1] / devicePixelRatio,
            ];
            vtkCamera.setIsPerformingCoordinateTransformation?.(false);
            return canvasCoordWithDPR;
        };
        this.hasImageURI = (imageURI) => {
            const volumeActors = this.getActors().filter((actorEntry) => actorIsA(actorEntry, 'vtkVolume'));
            return volumeActors.some(({ uid }) => {
                const volume = cache.getVolume(uid);
                if (!volume || !volume.imageIds) {
                    return false;
                }
                const volumeImageURIs = volume.imageIds.map(imageIdToURI);
                return volumeImageURIs.includes(imageURI);
            });
        };
        this.useCPURendering = getShouldUseCPURendering();
        this.use16BitTexture = this._shouldUseNativeDataType();
        if (this.useCPURendering) {
            throw new Error('VolumeViewports cannot be used whilst CPU Fallback Rendering is enabled.');
        }
        const renderer = this.getRenderer();
        const camera = vtkSlabCamera.newInstance();
        renderer.setActiveCamera(camera);
        switch (this.type) {
            case ViewportType.ORTHOGRAPHIC:
                camera.setParallelProjection(true);
                break;
            case ViewportType.VOLUME_3D:
                camera.setParallelProjection(true);
                break;
            case ViewportType.PERSPECTIVE:
                camera.setParallelProjection(false);
                break;
            default:
                throw new Error(`Unrecognized viewport type: ${this.type}`);
        }
        this.initializeVolumeNewImageEventDispatcher();
    }
    static get useCustomRenderingPipeline() {
        return false;
    }
    applyViewOrientation(orientation) {
        const { viewPlaneNormal, viewUp } = this._getOrientationVectors(orientation);
        const camera = this.getVtkActiveCamera();
        camera.setDirectionOfProjection(-viewPlaneNormal[0], -viewPlaneNormal[1], -viewPlaneNormal[2]);
        camera.setViewUpFrom(viewUp);
        this.resetCamera();
    }
    initializeVolumeNewImageEventDispatcher() {
        const volumeNewImageHandlerBound = volumeNewImageHandler.bind(this);
        const volumeNewImageCleanUpBound = volumeNewImageCleanUp.bind(this);
        function volumeNewImageHandler(cameraEvent) {
            const { viewportId } = cameraEvent.detail;
            if (viewportId !== this.id || this.isDisabled) {
                return;
            }
            const viewportImageData = this.getImageData();
            if (!viewportImageData) {
                return;
            }
            volumeNewImageEventDispatcher(cameraEvent);
        }
        function volumeNewImageCleanUp(evt) {
            const { viewportId } = evt.detail;
            if (viewportId !== this.id) {
                return;
            }
            this.element.removeEventListener(Events.CAMERA_MODIFIED, volumeNewImageHandlerBound);
            eventTarget.removeEventListener(Events.ELEMENT_DISABLED, volumeNewImageCleanUpBound);
            resetVolumeNewImageState(viewportId);
        }
        this.element.removeEventListener(Events.CAMERA_MODIFIED, volumeNewImageHandlerBound);
        this.element.addEventListener(Events.CAMERA_MODIFIED, volumeNewImageHandlerBound);
        eventTarget.addEventListener(Events.ELEMENT_DISABLED, volumeNewImageCleanUpBound);
    }
    resetVolumeViewportClippingRange() {
        const activeCamera = this.getVtkActiveCamera();
        if (activeCamera.getParallelProjection()) {
            activeCamera.setClippingRange(-RENDERING_DEFAULTS.MAXIMUM_RAY_DISTANCE, RENDERING_DEFAULTS.MAXIMUM_RAY_DISTANCE);
        }
        else {
            activeCamera.setClippingRange(RENDERING_DEFAULTS.MINIMUM_SLAB_THICKNESS, RENDERING_DEFAULTS.MAXIMUM_RAY_DISTANCE);
        }
    }
    setVOILUTFunction(voiLUTFunction, volumeId, suppressEvents) {
        if (Object.values(VOILUTFunctionType).indexOf(voiLUTFunction) === -1) {
            voiLUTFunction = VOILUTFunctionType.LINEAR;
        }
        const { voiRange } = this.getProperties();
        this.VOILUTFunction = voiLUTFunction;
        this.setVOI(voiRange, volumeId, suppressEvents);
    }
    setColormap(colormap, volumeId, suppressEvents) {
        const applicableVolumeActorInfo = this._getApplicableVolumeActor(volumeId);
        if (!applicableVolumeActorInfo) {
            return;
        }
        const { volumeActor } = applicableVolumeActorInfo;
        const mapper = volumeActor.getMapper();
        mapper.setSampleDistance(1.0);
        const cfun = vtkColorTransferFunction.newInstance();
        let colormapObj = colormapUtils.getColormap(colormap.name);
        const { name } = colormap;
        if (!colormapObj) {
            colormapObj = vtkColorMaps.getPresetByName(name);
        }
        if (!colormapObj) {
            throw new Error(`Colormap ${colormap} not found`);
        }
        const range = volumeActor
            .getProperty()
            .getRGBTransferFunction(0)
            .getRange();
        cfun.applyColorMap(colormapObj);
        cfun.setMappingRange(range[0], range[1]);
        volumeActor.getProperty().setRGBTransferFunction(0, cfun);
    }
    setOpacity(colormap, volumeId) {
        const applicableVolumeActorInfo = this._getApplicableVolumeActor(volumeId);
        if (!applicableVolumeActorInfo) {
            return;
        }
        const { volumeActor } = applicableVolumeActorInfo;
        const ofun = vtkPiecewiseFunction.newInstance();
        if (typeof colormap.opacity === 'number') {
            const range = volumeActor
                .getProperty()
                .getRGBTransferFunction(0)
                .getRange();
            ofun.addPoint(range[0], colormap.opacity);
            ofun.addPoint(range[1], colormap.opacity);
        }
        else {
            colormap.opacity.forEach(({ opacity, value }) => {
                ofun.addPoint(value, opacity);
            });
        }
        volumeActor.getProperty().setScalarOpacity(0, ofun);
    }
    setInvert(invert, volumeId, suppressEvents) {
        const applicableVolumeActorInfo = this._getApplicableVolumeActor(volumeId);
        if (!applicableVolumeActorInfo) {
            return;
        }
        const volumeIdToUse = applicableVolumeActorInfo.volumeId;
        const cfun = this._getOrCreateColorTransferFunction(volumeIdToUse);
        invertRgbTransferFunction(cfun);
        this.inverted = invert;
        const { voiRange } = this.getProperties();
        if (!suppressEvents) {
            const eventDetail = {
                viewportId: this.id,
                range: voiRange,
                volumeId: volumeIdToUse,
                VOILUTFunction: this.VOILUTFunction,
                invert: this.inverted,
                invertStateChanged: true,
            };
            triggerEvent(this.element, Events.VOI_MODIFIED, eventDetail);
        }
    }
    _getOrCreateColorTransferFunction(volumeId) {
        const applicableVolumeActorInfo = this._getApplicableVolumeActor(volumeId);
        if (!applicableVolumeActorInfo) {
            return null;
        }
        const { volumeActor } = applicableVolumeActorInfo;
        const rgbTransferFunction = volumeActor
            .getProperty()
            .getRGBTransferFunction(0);
        if (rgbTransferFunction) {
            return rgbTransferFunction;
        }
        const newRGBTransferFunction = vtkColorTransferFunction.newInstance();
        volumeActor.getProperty().setRGBTransferFunction(0, newRGBTransferFunction);
        return newRGBTransferFunction;
    }
    setVOI(voiRange, volumeId, suppressEvents = false) {
        const applicableVolumeActorInfo = this._getApplicableVolumeActor(volumeId);
        if (!applicableVolumeActorInfo) {
            return;
        }
        const { volumeActor } = applicableVolumeActorInfo;
        const volumeIdToUse = applicableVolumeActorInfo.volumeId;
        let voiRangeToUse = voiRange;
        if (typeof voiRangeToUse === 'undefined') {
            const imageData = volumeActor.getMapper().getInputData();
            const range = imageData.getPointData().getScalars().getRange();
            const maxVoiRange = { lower: range[0], upper: range[1] };
            voiRangeToUse = maxVoiRange;
        }
        if (this.VOILUTFunction === VOILUTFunctionType.SAMPLED_SIGMOID) {
            const cfun = createSigmoidRGBTransferFunction(voiRangeToUse);
            volumeActor.getProperty().setRGBTransferFunction(0, cfun);
        }
        else {
            const { lower, upper } = voiRangeToUse;
            volumeActor
                .getProperty()
                .getRGBTransferFunction(0)
                .setRange(lower, upper);
        }
        if (!suppressEvents) {
            const eventDetail = {
                viewportId: this.id,
                range: voiRange,
                volumeId: volumeIdToUse,
                VOILUTFunction: this.VOILUTFunction,
            };
            triggerEvent(this.element, Events.VOI_MODIFIED, eventDetail);
        }
    }
    setProperties({ voiRange, VOILUTFunction, invert, colormap, preset, } = {}, volumeId, suppressEvents = false) {
        if (colormap?.name) {
            this.setColormap(colormap, volumeId, suppressEvents);
        }
        if (colormap?.opacity != null) {
            this.setOpacity(colormap, volumeId);
        }
        if (voiRange !== undefined) {
            this.setVOI(voiRange, volumeId, suppressEvents);
        }
        if (VOILUTFunction !== undefined) {
            this.setVOILUTFunction(VOILUTFunction, volumeId, suppressEvents);
        }
        if (invert !== undefined && this.inverted !== invert) {
            this.setInvert(invert, volumeId, suppressEvents);
        }
        if (preset !== undefined) {
            this.setPreset(preset, volumeId, suppressEvents);
        }
    }
    setPreset(presetName, volumeId, suppressEvents) {
        const applicableVolumeActorInfo = this._getApplicableVolumeActor(volumeId);
        if (!applicableVolumeActorInfo) {
            return;
        }
        const { volumeActor } = applicableVolumeActorInfo;
        const preset = VIEWPORT_PRESETS.find((preset) => {
            return preset.name === presetName;
        });
        if (!preset) {
            return;
        }
        applyPreset(volumeActor, preset);
    }
    async setVolumes(volumeInputArray, immediate = false, suppressEvents = false) {
        const firstImageVolume = cache.getVolume(volumeInputArray[0].volumeId);
        if (!firstImageVolume) {
            throw new Error(`imageVolume with id: ${firstImageVolume.volumeId} does not exist`);
        }
        const FrameOfReferenceUID = firstImageVolume.metadata.FrameOfReferenceUID;
        await this._isValidVolumeInputArray(volumeInputArray, FrameOfReferenceUID);
        this._FrameOfReferenceUID = FrameOfReferenceUID;
        const volumeActors = [];
        for (let i = 0; i < volumeInputArray.length; i++) {
            const { volumeId, actorUID, slabThickness } = volumeInputArray[i];
            const actor = await createVolumeActor(volumeInputArray[i], this.element, this.id, suppressEvents, this.use16BitTexture);
            const uid = actorUID || volumeId;
            volumeActors.push({
                uid,
                actor,
                slabThickness,
                referenceId: volumeId,
            });
        }
        this._setVolumeActors(volumeActors);
        this.viewportStatus = ViewportStatus.PRE_RENDER;
        triggerEvent(this.element, Events.VOLUME_VIEWPORT_NEW_VOLUME, {
            viewportId: this.id,
            volumeActors,
        });
        if (immediate) {
            this.render();
        }
    }
    async addVolumes(volumeInputArray, immediate = false, suppressEvents = false) {
        const firstImageVolume = cache.getVolume(volumeInputArray[0].volumeId);
        if (!firstImageVolume) {
            throw new Error(`imageVolume with id: ${firstImageVolume.volumeId} does not exist`);
        }
        const volumeActors = [];
        await this._isValidVolumeInputArray(volumeInputArray, this._FrameOfReferenceUID);
        for (let i = 0; i < volumeInputArray.length; i++) {
            const { volumeId, visibility, actorUID, slabThickness } = volumeInputArray[i];
            const actor = await createVolumeActor(volumeInputArray[i], this.element, this.id, suppressEvents, this.use16BitTexture);
            if (visibility === false) {
                actor.setVisibility(false);
            }
            const uid = actorUID || volumeId;
            volumeActors.push({
                uid,
                actor,
                slabThickness,
                referenceId: volumeId,
            });
        }
        this.addActors(volumeActors);
        if (immediate) {
            this.render();
        }
    }
    removeVolumeActors(actorUIDs, immediate = false) {
        this.removeActors(actorUIDs);
        if (immediate) {
            this.render();
        }
    }
    setOrientation(orientation, immediate = true) {
        console.warn('Method "setOrientation" needs implementation');
    }
    _getApplicableVolumeActor(volumeId) {
        if (volumeId !== undefined && !this.getActor(volumeId)) {
            return;
        }
        const actorEntries = this.getActors();
        if (!actorEntries.length) {
            return;
        }
        let volumeActor;
        if (volumeId) {
            volumeActor = this.getActor(volumeId)?.actor;
        }
        if (!volumeActor) {
            volumeActor = actorEntries[0].actor;
            volumeId = actorEntries[0].uid;
        }
        return { volumeActor, volumeId };
    }
    async _isValidVolumeInputArray(volumeInputArray, FrameOfReferenceUID) {
        const numVolumes = volumeInputArray.length;
        for (let i = 1; i < numVolumes; i++) {
            const volumeInput = volumeInputArray[i];
            const imageVolume = await loadVolume(volumeInput.volumeId);
            if (!imageVolume) {
                throw new Error(`imageVolume with id: ${imageVolume.volumeId} does not exist`);
            }
            if (FrameOfReferenceUID !== imageVolume.metadata.FrameOfReferenceUID) {
                throw new Error(`Volumes being added to viewport ${this.id} do not share the same FrameOfReferenceUID. This is not yet supported`);
            }
        }
        return true;
    }
    getBounds() {
        const renderer = this.getRenderer();
        const bounds = renderer.computeVisiblePropBounds();
        return bounds;
    }
    flip(flipDirection) {
        super.flip(flipDirection);
    }
    hasVolumeId(volumeId) {
        const actorEntries = this.getActors();
        return actorEntries.some((actorEntry) => {
            return actorEntry.uid === volumeId;
        });
    }
    getImageData(volumeId) {
        const defaultActor = this.getDefaultActor();
        if (!defaultActor) {
            return;
        }
        const { uid: defaultActorUID } = defaultActor;
        volumeId = volumeId ?? defaultActorUID;
        const actorEntry = this.getActor(volumeId);
        if (!actorIsA(actorEntry, 'vtkVolume')) {
            return;
        }
        const actor = actorEntry.actor;
        const volume = cache.getVolume(volumeId);
        const vtkImageData = actor.getMapper().getInputData();
        return {
            dimensions: vtkImageData.getDimensions(),
            spacing: vtkImageData.getSpacing(),
            origin: vtkImageData.getOrigin(),
            direction: vtkImageData.getDirection(),
            scalarData: vtkImageData.getPointData().getScalars().isDeleted()
                ? null
                : vtkImageData.getPointData().getScalars().getData(),
            imageData: actor.getMapper().getInputData(),
            metadata: {
                Modality: volume?.metadata?.Modality,
            },
            scaling: volume?.scaling,
            hasPixelSpacing: true,
        };
    }
    _setVolumeActors(volumeActorEntries) {
        this.setActors(volumeActorEntries);
    }
    _getOrientationVectors(orientation) {
        if (typeof orientation === 'object') {
            if (orientation.viewPlaneNormal && orientation.viewUp) {
                return orientation;
            }
            else {
                throw new Error('Invalid orientation object. It must contain viewPlaneNormal and viewUp');
            }
        }
        else if (typeof orientation === 'string' &&
            MPR_CAMERA_VALUES[orientation]) {
            return MPR_CAMERA_VALUES[orientation];
        }
        else {
            throw new Error(`Invalid orientation: ${orientation}. Valid orientations are: ${Object.keys(MPR_CAMERA_VALUES).join(', ')}`);
        }
    }
    getSlabThickness() {
        const actors = this.getActors();
        let slabThickness = RENDERING_DEFAULTS.MINIMUM_SLAB_THICKNESS;
        actors.forEach((actor) => {
            if (actor.slabThickness > slabThickness) {
                slabThickness = actor.slabThickness;
            }
        });
        return slabThickness;
    }
    getIntensityFromWorld(point) {
        const actorEntry = this.getDefaultActor();
        if (!actorIsA(actorEntry, 'vtkVolume')) {
            return;
        }
        const { actor, uid } = actorEntry;
        const imageData = actor.getMapper().getInputData();
        const volume = cache.getVolume(uid);
        const { dimensions } = volume;
        const index = transformWorldToIndex(imageData, point);
        const voxelIndex = index[2] * dimensions[0] * dimensions[1] +
            index[1] * dimensions[0] +
            index[0];
        return volume.getScalarData()[voxelIndex];
    }
}
export default BaseVolumeViewport;
//# sourceMappingURL=BaseVolumeViewport.js.map