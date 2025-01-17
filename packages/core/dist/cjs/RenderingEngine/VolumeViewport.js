"use strict";
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
const Plane_1 = __importDefault(require("@kitware/vtk.js/Common/DataModel/Plane"));
const gl_matrix_1 = require("gl-matrix");
const cache_1 = __importDefault(require("../cache"));
const constants_1 = require("../constants");
const enums_1 = require("../enums");
const utilities_1 = require("../utilities");
const BaseVolumeViewport_1 = __importDefault(require("./BaseVolumeViewport"));
class VolumeViewport extends BaseVolumeViewport_1.default {
    constructor(props) {
        super(props);
        this._useAcquisitionPlaneForViewPlane = false;
        this.getCurrentImageIdIndex = () => {
            const { viewPlaneNormal, focalPoint } = this.getCamera();
            const { origin, spacing } = this.getImageData();
            const spacingInNormal = spacing[2];
            const sub = gl_matrix_1.vec3.create();
            gl_matrix_1.vec3.sub(sub, focalPoint, origin);
            const distance = gl_matrix_1.vec3.dot(sub, viewPlaneNormal);
            return Math.round(Math.abs(distance) / spacingInNormal);
        };
        this.getCurrentImageId = () => {
            if (this.getActors().length > 1) {
                console.warn(`Using the first/default actor of ${this.getActors().length} actors for getCurrentImageId.`);
            }
            const actorEntry = this.getDefaultActor();
            if (!actorEntry || !(0, utilities_1.actorIsA)(actorEntry, 'vtkVolume')) {
                return;
            }
            const { uid } = actorEntry;
            const volume = cache_1.default.getVolume(uid);
            if (!volume) {
                return;
            }
            const { viewPlaneNormal, focalPoint } = this.getCamera();
            return (0, utilities_1.getClosestImageId)(volume, focalPoint, viewPlaneNormal);
        };
        this.getRotation = () => 0;
        const { orientation } = this.options;
        if (orientation && orientation !== enums_1.OrientationAxis.ACQUISITION) {
            this.applyViewOrientation(orientation);
            return;
        }
        this._useAcquisitionPlaneForViewPlane = true;
    }
    setVolumes(volumeInputArray, immediate = false, suppressEvents = false) {
        const _super = Object.create(null, {
            setVolumes: { get: () => super.setVolumes }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const firstImageVolume = cache_1.default.getVolume(volumeInputArray[0].volumeId);
            if (!firstImageVolume) {
                throw new Error(`imageVolume with id: ${firstImageVolume.volumeId} does not exist`);
            }
            if (this._useAcquisitionPlaneForViewPlane) {
                this._setViewPlaneToAcquisitionPlane(firstImageVolume);
                this._useAcquisitionPlaneForViewPlane = false;
            }
            return _super.setVolumes.call(this, volumeInputArray, immediate, suppressEvents);
        });
    }
    addVolumes(volumeInputArray, immediate = false, suppressEvents = false) {
        const _super = Object.create(null, {
            addVolumes: { get: () => super.addVolumes }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const firstImageVolume = cache_1.default.getVolume(volumeInputArray[0].volumeId);
            if (!firstImageVolume) {
                throw new Error(`imageVolume with id: ${firstImageVolume.volumeId} does not exist`);
            }
            if (this._useAcquisitionPlaneForViewPlane) {
                this._setViewPlaneToAcquisitionPlane(firstImageVolume);
                this._useAcquisitionPlaneForViewPlane = false;
            }
            return _super.addVolumes.call(this, volumeInputArray, immediate, suppressEvents);
        });
    }
    setOrientation(orientation, immediate = true) {
        let viewPlaneNormal, viewUp;
        if (constants_1.MPR_CAMERA_VALUES[orientation]) {
            ({ viewPlaneNormal, viewUp } = constants_1.MPR_CAMERA_VALUES[orientation]);
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
        const imageVolume = cache_1.default.getVolume(volumeId);
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
                const clipPlane1 = Plane_1.default.newInstance();
                const clipPlane2 = Plane_1.default.newInstance();
                const newVtkPlanes = [clipPlane1, clipPlane2];
                let slabThickness = constants_1.RENDERING_DEFAULTS.MINIMUM_SLAB_THICKNESS;
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
            if ((0, utilities_1.actorIsA)(actorEntry, 'vtkVolume')) {
                actorEntry.slabThickness = slabThickness;
            }
        });
        const currentCamera = this.getCamera();
        this.updateClippingPlanesForActors(currentCamera);
        this.triggerCameraModifiedEventIfNecessary(currentCamera, currentCamera);
    }
}
exports.default = VolumeViewport;
//# sourceMappingURL=VolumeViewport.js.map