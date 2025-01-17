"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageVolume = void 0;
const isTypedArray_1 = __importDefault(require("../../utilities/isTypedArray"));
const utilities_1 = require("../../utilities");
const vtkClasses_1 = require("../../RenderingEngine/vtkClasses");
class ImageVolume {
    constructor(props) {
        this._imageIdsIndexMap = new Map();
        this._imageURIsIndexMap = new Map();
        this.isPreScaled = false;
        this.volumeId = props.volumeId;
        this.metadata = props.metadata;
        this.dimensions = props.dimensions;
        this.spacing = props.spacing;
        this.origin = props.origin;
        this.direction = props.direction;
        this.imageData = props.imageData;
        this.scalarData = props.scalarData;
        this.sizeInBytes = props.sizeInBytes;
        this.vtkOpenGLTexture = vtkClasses_1.vtkStreamingOpenGLTexture.newInstance();
        this.numVoxels =
            this.dimensions[0] * this.dimensions[1] * this.dimensions[2];
        if (props.scaling) {
            this.scaling = props.scaling;
        }
        if (props.referencedVolumeId) {
            this.referencedVolumeId = props.referencedVolumeId;
        }
    }
    get imageIds() {
        return this._imageIds;
    }
    set imageIds(newImageIds) {
        this._imageIds = newImageIds;
        this._reprocessImageIds();
    }
    _reprocessImageIds() {
        this._imageIdsIndexMap.clear();
        this._imageURIsIndexMap.clear();
        this._imageIds.forEach((imageId, i) => {
            const imageURI = (0, utilities_1.imageIdToURI)(imageId);
            this._imageIdsIndexMap.set(imageId, i);
            this._imageURIsIndexMap.set(imageURI, i);
        });
    }
    isDynamicVolume() {
        return false;
    }
    getScalarData() {
        if ((0, isTypedArray_1.default)(this.scalarData)) {
            return this.scalarData;
        }
        throw new Error('Unknow scalar data type');
    }
    getImageIdIndex(imageId) {
        return this._imageIdsIndexMap.get(imageId);
    }
    getImageURIIndex(imageURI) {
        return this._imageURIsIndexMap.get(imageURI);
    }
    destroy() {
        this.vtkOpenGLTexture.releaseGraphicsResources();
        this.vtkOpenGLTexture.destroyTexture();
        this.vtkOpenGLTexture.delete();
        this.imageData.delete();
        this.imageData = null;
        this.scalarData = null;
    }
}
exports.ImageVolume = ImageVolume;
exports.default = ImageVolume;
//# sourceMappingURL=ImageVolume.js.map