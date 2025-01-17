import isTypedArray from '../../utilities/isTypedArray';
import { imageIdToURI } from '../../utilities';
import { vtkStreamingOpenGLTexture } from '../../RenderingEngine/vtkClasses';
export class ImageVolume {
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
        this.vtkOpenGLTexture = vtkStreamingOpenGLTexture.newInstance();
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
            const imageURI = imageIdToURI(imageId);
            this._imageIdsIndexMap.set(imageId, i);
            this._imageURIsIndexMap.set(imageURI, i);
        });
    }
    isDynamicVolume() {
        return false;
    }
    getScalarData() {
        if (isTypedArray(this.scalarData)) {
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
export default ImageVolume;
//# sourceMappingURL=ImageVolume.js.map