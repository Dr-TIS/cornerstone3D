import vtkPlane from '@kitware/vtk.js/Common/DataModel/Plane';
import { vec3 } from 'gl-matrix';
import cache from '../cache';
import { MPR_CAMERA_VALUES, RENDERING_DEFAULTS } from '../constants';
import { OrientationAxis } from '../enums';
import { actorIsA, getClosestImageId } from '../utilities';
import BaseVolumeViewport from './BaseVolumeViewport';
class VolumeViewport extends BaseVolumeViewport {
    constructor(props) {
        super(props);
        this._useAcquisitionPlaneForViewPlane = false;
        this.getCurrentImageIdIndex = () => {
            const { viewPlaneNormal, focalPoint } = this.getCamera();
            const { origin, spacing } = this.getImageData();
            const spacingInNormal = spacing[2];
            const sub = vec3.create();
            vec3.sub(sub, focalPoint, origin);
            const distance = vec3.dot(sub, viewPlaneNormal);
            return Math.round(Math.abs(distance) / spacingInNormal);
        };
        this.getCurrentImageId = () => {
            if (this.getActors().length > 1) {
                console.warn(`Using the first/default actor of ${this.getActors().length} actors for getCurrentImageId.`);
            }
            const actorEntry = this.getDefaultActor();
            if (!actorEntry || !actorIsA(actorEntry, 'vtkVolume')) {
                return;
            }
            const { uid } = actorEntry;
            const volume = cache.getVolume(uid);
            if (!volume) {
                return;
            }
            const { viewPlaneNormal, focalPoint } = this.getCamera();
            return getClosestImageId(volume, focalPoint, viewPlaneNormal);
        };
        this.getRotation = () => 0;
        const { orientation } = this.options;
        if (orientation && orientation !== OrientationAxis.ACQUISITION) {
            this.applyViewOrientation(orientation);
            return;
        }
        this._useAcquisitionPlaneForViewPlane = true;
    }
    async setVolumes(volumeInputArray, immediate = false, suppressEvents = false) {
        const firstImageVolume = cache.getVolume(volumeInputArray[0].volumeId);
        if (!firstImageVolume) {
            throw new Error(`imageVolume with id: ${firstImageVolume.volumeId} does not exist`);
        }
        if (this._useAcquisitionPlaneForViewPlane) {
            this._setViewPlaneToAcquisitionPlane(firstImageVolume);
            this._useAcquisitionPlaneForViewPlane = false;
        }
        return super.setVolumes(volumeInputArray, immediate, suppressEvents);
    }
    async addVolumes(volumeInputArray, immediate = false, suppressEvents = false) {
        const firstImageVolume = cache.getVolume(volumeInputArray[0].volumeId);
        if (!firstImageVolume) {
            throw new Error(`imageVolume with id: ${firstImageVolume.volumeId} does not exist`);
        }
        if (this._useAcquisitionPlaneForViewPlane) {
            this._setViewPlaneToAcquisitionPlane(firstImageVolume);
            this._useAcquisitionPlaneForViewPlane = false;
        }
        return super.addVolumes(volumeInputArray, immediate, suppressEvents);
    }
    setOrientation(orientation, immediate = true) {
        let viewPlaneNormal, viewUp;
        if (MPR_CAMERA_VALUES[orientation]) {
            ({ viewPlaneNormal, viewUp } = MPR_CAMERA_VALUES[orientation]);
        }
        else if (orientation === 'acquisition') {
            ({ viewPlaneNormal, viewUp } = this._getAcquisitionPlaneOrientation());
        }
        else {
            throw new Error(`Invalid orientation: ${orientation}. Use Enums.OrientationAxis instead.`);
        }
        this.setCamera({
            viewPlaneNormal,
            viewUp,
        });
        this.resetCamera();
        if (immediate) {
            this.render();
        }
    }
    _getAcquisitionPlaneOrientation() {
        const actorEntry = this.getDefaultActor();
        if (!actorEntry) {
            return;
        }
        const volumeId = actorEntry.uid;
        const imageVolume = cache.getVolume(volumeId);
        if (!imageVolume) {
            throw new Error(`imageVolume with id: ${volumeId} does not exist in cache`);
        }
        const { direction } = imageVolume;
        const viewPlaneNormal = direction.slice(6, 9).map((x) => -x);
        const viewUp = direction.slice(3, 6).map((x) => -x);
        return {
            viewPlaneNormal,
            viewUp,
        };
    }
    _setViewPlaneToAcquisitionPlane(imageVolume) {
        let viewPlaneNormal, viewUp;
        if (imageVolume) {
            const { direction } = imageVolume;
            viewPlaneNormal = direction.slice(6, 9).map((x) => -x);
            viewUp = direction.slice(3, 6).map((x) => -x);
        }
        else {
            ({ viewPlaneNormal, viewUp } = this._getAcquisitionPlaneOrientation());
        }
        this.setCamera({
            viewPlaneNormal,
            viewUp,
        });
        this.resetCamera();
    }
    setBlendMode(blendMode, filterActorUIDs = [], immediate = false) {
        let actorEntries = this.getActors();
        if (filterActorUIDs && filterActorUIDs.length > 0) {
            actorEntries = actorEntries.filter((actorEntry) => {
                return filterActorUIDs.includes(actorEntry.uid);
            });
        }
        actorEntries.forEach((actorEntry) => {
            const { actor } = actorEntry;
            const mapper = actor.getMapper();
            mapper.setBlendMode(blendMode);
        });
        if (immediate) {
            this.render();
        }
    }
    resetCamera(resetPan = true, resetZoom = true, resetToCenter = true) {
        super.resetCamera(resetPan, resetZoom, resetToCenter);
        this.resetVolumeViewportClippingRange();
        const activeCamera = this.getVtkActiveCamera();
        const viewPlaneNormal = activeCamera.getViewPlaneNormal();
        const focalPoint = activeCamera.getFocalPoint();
        const actorEntries = this.getActors();
        actorEntries.forEach((actorEntry) => {
            if (!actorEntry.actor) {
                return;
            }
            const mapper = actorEntry.actor.getMapper();
            const vtkPlanes = mapper.getClippingPlanes();
            if (vtkPlanes.length === 0) {
                const clipPlane1 = vtkPlane.newInstance();
                const clipPlane2 = vtkPlane.newInstance();
                const newVtkPlanes = [clipPlane1, clipPlane2];
                let slabThickness = RENDERING_DEFAULTS.MINIMUM_SLAB_THICKNESS;
                if (actorEntry.slabThickness) {
                    slabThickness = actorEntry.slabThickness;
                }
                this.setOrientationOfClippingPlanes(newVtkPlanes, slabThickness, viewPlaneNormal, focalPoint);
                mapper.addClippingPlane(clipPlane1);
                mapper.addClippingPlane(clipPlane2);
            }
        });
        return true;
    }
    setSlabThickness(slabThickness, filterActorUIDs = []) {
        let actorEntries = this.getActors();
        if (filterActorUIDs && filterActorUIDs.length > 0) {
            actorEntries = actorEntries.filter((actorEntry) => {
                return filterActorUIDs.includes(actorEntry.uid);
            });
        }
        actorEntries.forEach((actorEntry) => {
            if (actorIsA(actorEntry, 'vtkVolume')) {
                actorEntry.slabThickness = slabThickness;
            }
        });
        const currentCamera = this.getCamera();
        this.updateClippingPlanesForActors(currentCamera);
        this.triggerCameraModifiedEventIfNecessary(currentCamera, currentCamera);
    }
}
export default VolumeViewport;
//# sourceMappingURL=VolumeViewport.js.map