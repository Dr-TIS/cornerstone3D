"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ColorTransferFunction_1 = __importDefault(require("@kitware/vtk.js/Rendering/Core/ColorTransferFunction"));
const ColorMaps_1 = __importDefault(require("@kitware/vtk.js/Rendering/Core/ColorTransferFunction/ColorMaps"));
const PiecewiseFunction_1 = __importDefault(require("@kitware/vtk.js/Common/DataModel/PiecewiseFunction"));
const cache_1 = __importDefault(require("../cache"));
const constants_1 = require("../constants");
const enums_1 = require("../enums");
const ViewportType_1 = __importDefault(require("../enums/ViewportType"));
const eventTarget_1 = __importDefault(require("../eventTarget"));
const init_1 = require("../init");
const volumeLoader_1 = require("../loaders/volumeLoader");
const utilities_1 = require("../utilities");
const helpers_1 = require("./helpers");
const volumeNewImageEventDispatcher_1 = __importStar(require("./helpers/volumeNewImageEventDispatcher"));
const Viewport_1 = __importDefault(require("./Viewport"));
const vtkSlabCamera_1 = __importDefault(require("./vtkClasses/vtkSlabCamera"));
const transformWorldToIndex_1 = __importDefault(require("../utilities/transformWorldToIndex"));
class BaseVolumeViewport extends Viewport_1.default {
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
                const volume = cache_1.default.getVolume(volumeId);
                if (!volume)
                    return null;
                const cfun = volumeActor.getProperty().getRGBTransferFunction(0);
                const [lower, upper] = this.VOILUTFunction === 'SIGMOID'
                    ? (0, utilities_1.getVoiFromSigmoidRGBTransferFunction)(cfun)
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
            var _a, _b;
            const vtkCamera = this.getVtkActiveCamera();
            (_a = vtkCamera.setIsPerformingCoordinateTransformation) === null || _a === void 0 ? void 0 : _a.call(vtkCamera, true);
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
            (_b = vtkCamera.setIsPerformingCoordinateTransformation) === null || _b === void 0 ? void 0 : _b.call(vtkCamera, false);
            return [worldCoord[0], worldCoord[1], worldCoord[2]];
        };
        this.worldToCanvas = (worldPos) => {
            var _a, _b;
            const vtkCamera = this.getVtkActiveCamera();
            (_a = vtkCamera.setIsPerformingCoordinateTransformation) === null || _a === void 0 ? void 0 : _a.call(vtkCamera, true);
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
            (_b = vtkCamera.setIsPerformingCoordinateTransformation) === null || _b === void 0 ? void 0 : _b.call(vtkCamera, false);
            return canvasCoordWithDPR;
        };
        this.hasImageURI = (imageURI) => {
            const volumeActors = this.getActors().filter((actorEntry) => (0, utilities_1.actorIsA)(actorEntry, 'vtkVolume'));
            return volumeActors.some(({ uid }) => {
                const volume = cache_1.default.getVolume(uid);
                if (!volume || !volume.imageIds) {
                    return false;
                }
                const volumeImageURIs = volume.imageIds.map(utilities_1.imageIdToURI);
                return volumeImageURIs.includes(imageURI);
            });
        };
        this.useCPURendering = (0, init_1.getShouldUseCPURendering)();
        this.use16BitTexture = this._shouldUseNativeDataType();
        if (this.useCPURendering) {
            throw new Error('VolumeViewports cannot be used whilst CPU Fallback Rendering is enabled.');
        }
        const renderer = this.getRenderer();
        const camera = vtkSlabCamera_1.default.newInstance();
        renderer.setActiveCamera(camera);
        switch (this.type) {
            case ViewportType_1.default.ORTHOGRAPHIC:
                camera.setParallelProjection(true);
                break;
            case ViewportType_1.default.VOLUME_3D:
                camera.setParallelProjection(true);
                break;
            case ViewportType_1.default.PERSPECTIVE:
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
            (0, volumeNewImageEventDispatcher_1.default)(cameraEvent);
        }
        function volumeNewImageCleanUp(evt) {
            const { viewportId } = evt.detail;
            if (viewportId !== this.id) {
                return;
            }
            this.element.removeEventListener(enums_1.Events.CAMERA_MODIFIED, volumeNewImageHandlerBound);
            eventTarget_1.default.removeEventListener(enums_1.Events.ELEMENT_DISABLED, volumeNewImageCleanUpBound);
            (0, volumeNewImageEventDispatcher_1.resetVolumeNewImageState)(viewportId);
        }
        this.element.removeEventListener(enums_1.Events.CAMERA_MODIFIED, volumeNewImageHandlerBound);
        this.element.addEventListener(enums_1.Events.CAMERA_MODIFIED, volumeNewImageHandlerBound);
        eventTarget_1.default.addEventListener(enums_1.Events.ELEMENT_DISABLED, volumeNewImageCleanUpBound);
    }
    resetVolumeViewportClippingRange() {
        const activeCamera = this.getVtkActiveCamera();
        if (activeCamera.getParallelProjection()) {
            activeCamera.setClippingRange(-constants_1.RENDERING_DEFAULTS.MAXIMUM_RAY_DISTANCE, constants_1.RENDERING_DEFAULTS.MAXIMUM_RAY_DISTANCE);
        }
        else {
            activeCamera.setClippingRange(constants_1.RENDERING_DEFAULTS.MINIMUM_SLAB_THICKNESS, constants_1.RENDERING_DEFAULTS.MAXIMUM_RAY_DISTANCE);
        }
    }
    setVOILUTFunction(voiLUTFunction, volumeId, suppressEvents) {
        if (Object.values(enums_1.VOILUTFunctionType).indexOf(voiLUTFunction) === -1) {
            voiLUTFunction = enums_1.VOILUTFunctionType.LINEAR;
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
        const cfun = ColorTransferFunction_1.default.newInstance();
        let colormapObj = utilities_1.colormap.getColormap(colormap.name);
        const { name } = colormap;
        if (!colormapObj) {
            colormapObj = ColorMaps_1.default.getPresetByName(name);
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
        const ofun = PiecewiseFunction_1.default.newInstance();
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
        (0, utilities_1.invertRgbTransferFunction)(cfun);
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
            (0, utilities_1.triggerEvent)(this.element, enums_1.Events.VOI_MODIFIED, eventDetail);
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
        const newRGBTransferFunction = ColorTransferFunction_1.default.newInstance();
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
        if (this.VOILUTFunction === enums_1.VOILUTFunctionType.SAMPLED_SIGMOID) {
            const cfun = (0, utilities_1.createSigmoidRGBTransferFunction)(voiRangeToUse);
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
            (0, utilities_1.triggerEvent)(this.element, enums_1.Events.VOI_MODIFIED, eventDetail);
        }
    }
    setProperties({ voiRange, VOILUTFunction, invert, colormap, preset, } = {}, volumeId, suppressEvents = false) {
        if (colormap === null || colormap === void 0 ? void 0 : colormap.name) {
            this.setColormap(colormap, volumeId, suppressEvents);
        }
        if ((colormap === null || colormap === void 0 ? void 0 : colormap.opacity) != null) {
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
        const preset = constants_1.VIEWPORT_PRESETS.find((preset) => {
            return preset.name === presetName;
        });
        if (!preset) {
            return;
        }
        (0, utilities_1.applyPreset)(volumeActor, preset);
    }
    setVolumes(volumeInputArray, immediate = false, suppressEvents = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const firstImageVolume = cache_1.default.getVolume(volumeInputArray[0].volumeId);
            if (!firstImageVolume) {
                throw new Error(`imageVolume with id: ${firstImageVolume.volumeId} does not exist`);
            }
            const FrameOfReferenceUID = firstImageVolume.metadata.FrameOfReferenceUID;
            yield this._isValidVolumeInputArray(volumeInputArray, FrameOfReferenceUID);
            this._FrameOfReferenceUID = FrameOfReferenceUID;
            const volumeActors = [];
            for (let i = 0; i < volumeInputArray.length; i++) {
                const { volumeId, actorUID, slabThickness } = volumeInputArray[i];
                const actor = yield (0, helpers_1.createVolumeActor)(volumeInputArray[i], this.element, this.id, suppressEvents, this.use16BitTexture);
                const uid = actorUID || volumeId;
                volumeActors.push({
                    uid,
                    actor,
                    slabThickness,
                    referenceId: volumeId,
                });
            }
            this._setVolumeActors(volumeActors);
            this.viewportStatus = enums_1.ViewportStatus.PRE_RENDER;
            (0, utilities_1.triggerEvent)(this.element, enums_1.Events.VOLUME_VIEWPORT_NEW_VOLUME, {
                viewportId: this.id,
                volumeActors,
            });
            if (immediate) {
                this.render();
            }
        });
    }
    addVolumes(volumeInputArray, immediate = false, suppressEvents = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const firstImageVolume = cache_1.default.getVolume(volumeInputArray[0].volumeId);
            if (!firstImageVolume) {
                throw new Error(`imageVolume with id: ${firstImageVolume.volumeId} does not exist`);
            }
            const volumeActors = [];
            yield this._isValidVolumeInputArray(volumeInputArray, this._FrameOfReferenceUID);
            for (let i = 0; i < volumeInputArray.length; i++) {
                const { volumeId, visibility, actorUID, slabThickness } = volumeInputArray[i];
                const actor = yield (0, helpers_1.createVolumeActor)(volumeInputArray[i], this.element, this.id, suppressEvents, this.use16BitTexture);
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
        });
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
        var _a;
        if (volumeId !== undefined && !this.getActor(volumeId)) {
            return;
        }
        const actorEntries = this.getActors();
        if (!actorEntries.length) {
            return;
        }
        let volumeActor;
        if (volumeId) {
            volumeActor = (_a = this.getActor(volumeId)) === null || _a === void 0 ? void 0 : _a.actor;
        }
        if (!volumeActor) {
            volumeActor = actorEntries[0].actor;
            volumeId = actorEntries[0].uid;
        }
        return { volumeActor, volumeId };
    }
    _isValidVolumeInputArray(volumeInputArray, FrameOfReferenceUID) {
        return __awaiter(this, void 0, void 0, function* () {
            const numVolumes = volumeInputArray.length;
            for (let i = 1; i < numVolumes; i++) {
                const volumeInput = volumeInputArray[i];
                const imageVolume = yield (0, volumeLoader_1.loadVolume)(volumeInput.volumeId);
                if (!imageVolume) {
                    throw new Error(`imageVolume with id: ${imageVolume.volumeId} does not exist`);
                }
                if (FrameOfReferenceUID !== imageVolume.metadata.FrameOfReferenceUID) {
                    throw new Error(`Volumes being added to viewport ${this.id} do not share the same FrameOfReferenceUID. This is not yet supported`);
                }
            }
            return true;
        });
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
        var _a;
        const defaultActor = this.getDefaultActor();
        if (!defaultActor) {
            return;
        }
        const { uid: defaultActorUID } = defaultActor;
        volumeId = volumeId !== null && volumeId !== void 0 ? volumeId : defaultActorUID;
        const actorEntry = this.getActor(volumeId);
        if (!(0, utilities_1.actorIsA)(actorEntry, 'vtkVolume')) {
            return;
        }
        const actor = actorEntry.actor;
        const volume = cache_1.default.getVolume(volumeId);
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
                Modality: (_a = volume === null || volume === void 0 ? void 0 : volume.metadata) === null || _a === void 0 ? void 0 : _a.Modality,
            },
            scaling: volume === null || volume === void 0 ? void 0 : volume.scaling,
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
            constants_1.MPR_CAMERA_VALUES[orientation]) {
            return constants_1.MPR_CAMERA_VALUES[orientation];
        }
        else {
            throw new Error(`Invalid orientation: ${orientation}. Valid orientations are: ${Object.keys(constants_1.MPR_CAMERA_VALUES).join(', ')}`);
        }
    }
    getSlabThickness() {
        const actors = this.getActors();
        let slabThickness = constants_1.RENDERING_DEFAULTS.MINIMUM_SLAB_THICKNESS;
        actors.forEach((actor) => {
            if (actor.slabThickness > slabThickness) {
                slabThickness = actor.slabThickness;
            }
        });
        return slabThickness;
    }
    getIntensityFromWorld(point) {
        const actorEntry = this.getDefaultActor();
        if (!(0, utilities_1.actorIsA)(actorEntry, 'vtkVolume')) {
            return;
        }
        const { actor, uid } = actorEntry;
        const imageData = actor.getMapper().getInputData();
        const volume = cache_1.default.getVolume(uid);
        const { dimensions } = volume;
        const index = (0, transformWorldToIndex_1.default)(imageData, point);
        const voxelIndex = index[2] * dimensions[0] * dimensions[1] +
            index[1] * dimensions[0] +
            index[0];
        return volume.getScalarData()[voxelIndex];
    }
}
exports.default = BaseVolumeViewport;
//# sourceMappingURL=BaseVolumeViewport.js.map