"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@cornerstonejs/core");
const helpers_1 = require("./helpers");
const requestType = core_1.Enums.RequestType.Prefetch;
const { getMinMax } = core_1.utilities;
class BaseStreamingImageVolume extends core_1.ImageVolume {
    constructor(imageVolumeProperties, streamingProperties) {
        super(imageVolumeProperties);
        this.framesLoaded = 0;
        this.framesProcessed = 0;
        this.cornerstoneImageMetaData = null;
        this.cancelLoading = () => {
            const { loadStatus } = this;
            if (!loadStatus || !loadStatus.loading) {
                return;
            }
            loadStatus.loading = false;
            loadStatus.cancelled = true;
            this.clearLoadCallbacks();
            const filterFunction = ({ additionalDetails }) => {
                return additionalDetails.volumeId !== this.volumeId;
            };
            core_1.imageLoadPoolManager.filterRequests(filterFunction);
        };
        this.load = (callback, priority = 5) => {
            const { imageIds, loadStatus, numFrames } = this;
            if (loadStatus.loading === true) {
                console.log(`loadVolume: Loading is already in progress for ${this.volumeId}`);
                return;
            }
            const { loaded } = this.loadStatus;
            const totalNumFrames = imageIds.length;
            if (loaded) {
                if (callback) {
                    callback({
                        success: true,
                        framesLoaded: totalNumFrames,
                        framesProcessed: totalNumFrames,
                        numFrames,
                        totalNumFrames,
                    });
                }
                return;
            }
            if (callback) {
                this.loadStatus.callbacks.push(callback);
            }
            this._prefetchImageIds(priority);
        };
        this.getImageIdsRequests = (imageIds, scalarData, priority) => {
            const { loadStatus } = this;
            const { cachedFrames } = loadStatus;
            const { vtkOpenGLTexture, imageData, metadata, volumeId } = this;
            const { FrameOfReferenceUID } = metadata;
            const arrayBuffer = scalarData.buffer;
            const numFrames = imageIds.length;
            const length = scalarData.length / numFrames;
            const lengthInBytes = arrayBuffer.byteLength / numFrames;
            let type;
            if (scalarData instanceof Uint8Array) {
                type = 'Uint8Array';
            }
            else if (scalarData instanceof Float32Array) {
                type = 'Float32Array';
            }
            else if (scalarData instanceof Uint16Array) {
                type = 'Uint16Array';
            }
            else if (scalarData instanceof Int16Array) {
                type = 'Int16Array';
            }
            else {
                throw new Error('Unsupported array type');
            }
            const totalNumFrames = this.imageIds.length;
            const autoRenderOnLoad = true;
            const autoRenderPercentage = 2;
            let reRenderFraction;
            let reRenderTarget;
            if (autoRenderOnLoad) {
                reRenderFraction = totalNumFrames * (autoRenderPercentage / 100);
                reRenderTarget = reRenderFraction;
            }
            function callLoadStatusCallback(evt) {
                if (autoRenderOnLoad) {
                    if (evt.framesProcessed > reRenderTarget ||
                        evt.framesProcessed === evt.totalNumFrames) {
                        reRenderTarget += reRenderFraction;
                        (0, helpers_1.autoLoad)(volumeId);
                    }
                }
                if (evt.framesProcessed === evt.totalNumFrames) {
                    loadStatus.callbacks.forEach((callback) => callback(evt));
                    const eventDetail = {
                        FrameOfReferenceUID,
                        volumeId: volumeId,
                    };
                    (0, core_1.triggerEvent)(core_1.eventTarget, core_1.Enums.Events.IMAGE_VOLUME_LOADING_COMPLETED, eventDetail);
                }
            }
            const updateTextureAndTriggerEvents = (volume, imageIdIndex, imageId) => {
                const frameIndex = this._imageIdIndexToFrameIndex(imageIdIndex);
                cachedFrames[imageIdIndex] = true;
                this.framesLoaded++;
                this.framesProcessed++;
                vtkOpenGLTexture.setUpdatedFrame(frameIndex);
                imageData.modified();
                const eventDetail = {
                    FrameOfReferenceUID,
                    imageVolume: volume,
                };
                (0, core_1.triggerEvent)(core_1.eventTarget, core_1.Enums.Events.IMAGE_VOLUME_MODIFIED, eventDetail);
                if (this.framesProcessed === totalNumFrames) {
                    loadStatus.loaded = true;
                    loadStatus.loading = false;
                    callLoadStatusCallback({
                        success: true,
                        imageIdIndex,
                        imageId,
                        framesLoaded: this.framesLoaded,
                        framesProcessed: this.framesProcessed,
                        numFrames,
                        totalNumFrames,
                    });
                    loadStatus.callbacks = [];
                }
                else {
                    callLoadStatusCallback({
                        success: true,
                        imageIdIndex,
                        imageId,
                        framesLoaded: this.framesLoaded,
                        framesProcessed: this.framesProcessed,
                        numFrames,
                        totalNumFrames,
                    });
                }
            };
            const successCallback = (imageIdIndex, imageId, scalingParameters) => {
                const frameIndex = this._imageIdIndexToFrameIndex(imageIdIndex);
                const cachedImage = core_1.cache.getCachedImageBasedOnImageURI(imageId);
                const cachedVolume = core_1.cache.getVolumeContainingImageId(imageId);
                if (loadStatus.cancelled) {
                    console.warn('volume load cancelled, returning for imageIdIndex: ', imageIdIndex);
                    return;
                }
                if (!(cachedImage === null || cachedImage === void 0 ? void 0 : cachedImage.image) &&
                    !(cachedVolume && cachedVolume.volume !== this)) {
                    return updateTextureAndTriggerEvents(this, imageIdIndex, imageId);
                }
                const isFromImageCache = !!cachedImage;
                const cachedImageOrVolume = cachedImage || cachedVolume.volume;
                this.handleImageComingFromCache(cachedImageOrVolume, isFromImageCache, scalingParameters, scalarData, frameIndex, arrayBuffer, updateTextureAndTriggerEvents, imageIdIndex, imageId, errorCallback);
            };
            function errorCallback(error, imageIdIndex, imageId) {
                this.framesProcessed++;
                if (this.framesProcessed === totalNumFrames) {
                    loadStatus.loaded = true;
                    loadStatus.loading = false;
                    callLoadStatusCallback({
                        success: false,
                        imageId,
                        imageIdIndex,
                        error,
                        framesLoaded: this.framesLoaded,
                        framesProcessed: this.framesProcessed,
                        numFrames,
                        totalNumFrames,
                    });
                    loadStatus.callbacks = [];
                }
                else {
                    callLoadStatusCallback({
                        success: false,
                        imageId,
                        imageIdIndex,
                        error,
                        framesLoaded: this.framesLoaded,
                        framesProcessed: this.framesProcessed,
                        numFrames,
                        totalNumFrames,
                    });
                }
                const eventDetail = {
                    error,
                    imageIdIndex,
                    imageId,
                };
                (0, core_1.triggerEvent)(core_1.eventTarget, core_1.Enums.Events.IMAGE_LOAD_ERROR, eventDetail);
            }
            function handleArrayBufferLoad(scalarData, image, options) {
                if (!(scalarData.buffer instanceof ArrayBuffer)) {
                    return;
                }
                const offset = options.targetBuffer.offset;
                const length = options.targetBuffer.length;
                const pixelData = image.pixelData
                    ? image.pixelData
                    : image.getPixelData();
                try {
                    if (scalarData instanceof Float32Array) {
                        const bytesInFloat = 4;
                        const floatView = new Float32Array(pixelData);
                        if (floatView.length !== length) {
                            throw 'Error pixelData length does not match frame length';
                        }
                        scalarData.set(floatView, offset / bytesInFloat);
                    }
                    if (scalarData instanceof Int16Array) {
                        const bytesInInt16 = 2;
                        const intView = new Int16Array(pixelData);
                        if (intView.length !== length) {
                            throw 'Error pixelData length does not match frame length';
                        }
                        scalarData.set(intView, offset / bytesInInt16);
                    }
                    if (scalarData instanceof Uint16Array) {
                        const bytesInUint16 = 2;
                        const intView = new Uint16Array(pixelData);
                        if (intView.length !== length) {
                            throw 'Error pixelData length does not match frame length';
                        }
                        scalarData.set(intView, offset / bytesInUint16);
                    }
                    if (scalarData instanceof Uint8Array) {
                        const bytesInUint8 = 1;
                        const intView = new Uint8Array(pixelData);
                        if (intView.length !== length) {
                            throw 'Error pixelData length does not match frame length';
                        }
                        scalarData.set(intView, offset / bytesInUint8);
                    }
                }
                catch (e) {
                    console.error(e);
                }
            }
            const requests = imageIds.map((imageId, frameIndex) => {
                const imageIdIndex = this.getImageIdIndex(imageId);
                if (cachedFrames[imageIdIndex]) {
                    this.framesLoaded++;
                    this.framesProcessed++;
                    return;
                }
                const modalityLutModule = core_1.metaData.get('modalityLutModule', imageId) || {};
                const generalSeriesModule = core_1.metaData.get('generalSeriesModule', imageId) || {};
                const scalingParameters = {
                    rescaleSlope: modalityLutModule.rescaleSlope,
                    rescaleIntercept: modalityLutModule.rescaleIntercept,
                    modality: generalSeriesModule.modality,
                };
                if (scalingParameters.modality === 'PT') {
                    const suvFactor = core_1.metaData.get('scalingModule', imageId);
                    if (suvFactor) {
                        this._addScalingToVolume(suvFactor);
                        scalingParameters.suvbw = suvFactor.suvbw;
                    }
                }
                const isSlopeAndInterceptNumbers = typeof scalingParameters.rescaleSlope === 'number' &&
                    typeof scalingParameters.rescaleIntercept === 'number';
                this.isPreScaled = isSlopeAndInterceptNumbers;
                const options = {
                    targetBuffer: {
                        arrayBuffer: arrayBuffer instanceof ArrayBuffer ? undefined : arrayBuffer,
                        offset: frameIndex * lengthInBytes,
                        length,
                        type,
                    },
                    skipCreateImage: true,
                    preScale: {
                        enabled: true,
                        scalingParameters,
                    },
                };
                const callLoadImage = (imageId, imageIdIndex, options) => {
                    return core_1.imageLoader.loadImage(imageId, options).then((image) => {
                        handleArrayBufferLoad(scalarData, image, options);
                        successCallback(imageIdIndex, imageId, scalingParameters);
                    }, (error) => {
                        errorCallback.call(this, error, imageIdIndex, imageId);
                    });
                };
                return {
                    callLoadImage,
                    imageId,
                    imageIdIndex,
                    options,
                    priority,
                    requestType,
                    additionalDetails: {
                        volumeId: this.volumeId,
                    },
                };
            });
            return requests;
        };
        this.imageIds = streamingProperties.imageIds;
        this.loadStatus = streamingProperties.loadStatus;
        this.numFrames = this._getNumFrames();
        this._createCornerstoneImageMetaData();
    }
    _getNumFrames() {
        const { imageIds, scalarData } = this;
        const scalarDataCount = this.isDynamicVolume() ? scalarData.length : 1;
        return imageIds.length / scalarDataCount;
    }
    _getScalarDataLength() {
        const { scalarData } = this;
        return this.isDynamicVolume()
            ? scalarData[0].length
            : scalarData.length;
    }
    _createCornerstoneImageMetaData() {
        const { numFrames } = this;
        if (numFrames === 0) {
            return;
        }
        const bytesPerImage = this.sizeInBytes / numFrames;
        const scalarDataLength = this._getScalarDataLength();
        const numComponents = scalarDataLength / this.numVoxels;
        const pixelsPerImage = this.dimensions[0] * this.dimensions[1] * numComponents;
        const { PhotometricInterpretation, voiLut, VOILUTFunction } = this.metadata;
        let windowCenter = [];
        let windowWidth = [];
        if (voiLut && voiLut.length) {
            windowCenter = voiLut.map((voi) => {
                return voi.windowCenter;
            });
            windowWidth = voiLut.map((voi) => {
                return voi.windowWidth;
            });
        }
        const color = numComponents > 1 ? true : false;
        this.cornerstoneImageMetaData = {
            bytesPerImage,
            numComponents,
            pixelsPerImage,
            windowCenter,
            windowWidth,
            color,
            rgba: false,
            spacing: this.spacing,
            dimensions: this.dimensions,
            photometricInterpretation: PhotometricInterpretation,
            voiLUTFunction: VOILUTFunction,
            invert: PhotometricInterpretation === 'MONOCHROME1',
        };
    }
    _imageIdIndexToFrameIndex(imageIdIndex) {
        return imageIdIndex % this.numFrames;
    }
    getScalarDataArrays() {
        return this.isDynamicVolume()
            ? this.scalarData
            : [this.scalarData];
    }
    _getScalarDataByImageIdIndex(imageIdIndex) {
        if (imageIdIndex < 0 || imageIdIndex >= this.imageIds.length) {
            throw new Error('imageIdIndex out of range');
        }
        const scalarDataArrays = this.getScalarDataArrays();
        const scalarDataIndex = Math.floor(imageIdIndex / this.numFrames);
        return scalarDataArrays[scalarDataIndex];
    }
    invalidateVolume(immediate) {
        const { imageData, vtkOpenGLTexture } = this;
        const { numFrames } = this;
        for (let i = 0; i < numFrames; i++) {
            vtkOpenGLTexture.setUpdatedFrame(i);
        }
        imageData.modified();
        if (immediate) {
            (0, helpers_1.autoLoad)(this.volumeId);
        }
    }
    clearLoadCallbacks() {
        this.loadStatus.callbacks = [];
    }
    handleImageComingFromCache(cachedImageOrVolume, isFromImageCache, scalingParameters, scalarData, frameIndex, arrayBuffer, updateTextureAndTriggerEvents, imageIdIndex, imageId, errorCallback) {
        const imageLoadObject = isFromImageCache
            ? cachedImageOrVolume.imageLoadObject
            : cachedImageOrVolume.convertToCornerstoneImage(imageId, imageIdIndex);
        imageLoadObject.promise
            .then((cachedImage) => {
            const imageScalarData = this._scaleIfNecessary(cachedImage, scalingParameters);
            const { pixelsPerImage, bytesPerImage } = this.cornerstoneImageMetaData;
            const TypedArray = scalarData.constructor;
            let byteOffset = bytesPerImage * frameIndex;
            const bytePerPixel = bytesPerImage / pixelsPerImage;
            if (scalarData.BYTES_PER_ELEMENT !== bytePerPixel) {
                byteOffset *= scalarData.BYTES_PER_ELEMENT / bytePerPixel;
            }
            const volumeBufferView = new TypedArray(arrayBuffer, byteOffset, pixelsPerImage);
            volumeBufferView.set(imageScalarData);
            updateTextureAndTriggerEvents(this, imageIdIndex, imageId);
        })
            .catch((err) => {
            errorCallback.call(this, err, imageIdIndex, imageId);
        });
    }
    getImageLoadRequests(_priority) {
        throw new Error('Abstract method');
    }
    _prefetchImageIds(priority) {
        this.loadStatus.loading = true;
        const requests = this.getImageLoadRequests(priority);
        requests.reverse().forEach((request) => {
            if (!request) {
                return;
            }
            const { callLoadImage, imageId, imageIdIndex, options, priority, requestType, additionalDetails, } = request;
            core_1.imageLoadPoolManager.addRequest(callLoadImage.bind(this, imageId, imageIdIndex, options), requestType, additionalDetails, priority);
        });
    }
    _scaleIfNecessary(image, scalingParametersToUse) {
        var _a;
        const imageIsAlreadyScaled = (_a = image.preScale) === null || _a === void 0 ? void 0 : _a.scaled;
        const noScalingParametersToUse = !scalingParametersToUse ||
            !scalingParametersToUse.rescaleIntercept ||
            !scalingParametersToUse.rescaleSlope;
        if (!imageIsAlreadyScaled && noScalingParametersToUse) {
            return image.getPixelData().slice(0);
        }
        if (!imageIsAlreadyScaled &&
            scalingParametersToUse &&
            scalingParametersToUse.rescaleIntercept !== undefined &&
            scalingParametersToUse.rescaleSlope !== undefined) {
            const pixelDataCopy = image.getPixelData().slice(0);
            const scaledArray = (0, helpers_1.scaleArray)(pixelDataCopy, scalingParametersToUse);
            return scaledArray;
        }
        const { rescaleSlope: rescaleSlopeToUse, rescaleIntercept: rescaleInterceptToUse, suvbw: suvbwToUse, } = scalingParametersToUse;
        const { rescaleSlope: rescaleSlopeUsed, rescaleIntercept: rescaleInterceptUsed, suvbw: suvbwUsed, } = image.preScale.scalingParameters;
        const rescaleSlopeIsSame = rescaleSlopeToUse === rescaleSlopeUsed;
        const rescaleInterceptIsSame = rescaleInterceptToUse === rescaleInterceptUsed;
        const suvbwIsSame = suvbwToUse === suvbwUsed;
        if (rescaleSlopeIsSame && rescaleInterceptIsSame && suvbwIsSame) {
            return image.getPixelData();
        }
        const pixelDataCopy = image.getPixelData().slice(0);
        const newSuvbw = suvbwToUse / suvbwUsed;
        const newRescaleSlope = rescaleSlopeToUse / rescaleSlopeUsed;
        const newRescaleIntercept = rescaleInterceptToUse - rescaleInterceptUsed * newRescaleSlope;
        const newScalingParameters = Object.assign(Object.assign({}, scalingParametersToUse), { rescaleSlope: newRescaleSlope, rescaleIntercept: newRescaleIntercept, suvbw: newSuvbw });
        const scaledArray = (0, helpers_1.scaleArray)(pixelDataCopy, newScalingParameters);
        return scaledArray;
    }
    _addScalingToVolume(suvFactor) {
        if (this.scaling) {
            return;
        }
        const { suvbw, suvlbm, suvbsa } = suvFactor;
        const petScaling = {};
        if (suvlbm) {
            petScaling.suvbwToSuvlbm = suvlbm / suvbw;
        }
        if (suvbsa) {
            petScaling.suvbwToSuvbsa = suvbsa / suvbw;
        }
        if (suvbw) {
            petScaling.suvbw = suvbw;
        }
        this.scaling = { PT: petScaling };
    }
    _removeFromCache() {
        core_1.cache.removeVolumeLoadObject(this.volumeId);
    }
    getCornerstoneImage(imageId, imageIdIndex) {
        const { imageIds } = this;
        const frameIndex = this._imageIdIndexToFrameIndex(imageIdIndex);
        const { bytesPerImage, pixelsPerImage, windowCenter, windowWidth, numComponents, color, dimensions, spacing, invert, voiLUTFunction, photometricInterpretation, } = this.cornerstoneImageMetaData;
        const scalarData = this._getScalarDataByImageIdIndex(imageIdIndex);
        const volumeBuffer = scalarData.buffer;
        const TypedArray = scalarData.constructor;
        const bytePerPixel = bytesPerImage / pixelsPerImage;
        let byteOffset = bytesPerImage * frameIndex;
        if (scalarData.BYTES_PER_ELEMENT !== bytePerPixel) {
            byteOffset *= scalarData.BYTES_PER_ELEMENT / bytePerPixel;
        }
        const imageScalarData = new TypedArray(pixelsPerImage);
        const volumeBufferView = new TypedArray(volumeBuffer, byteOffset, pixelsPerImage);
        imageScalarData.set(volumeBufferView);
        const volumeImageId = imageIds[imageIdIndex];
        const modalityLutModule = core_1.metaData.get('modalityLutModule', volumeImageId) || {};
        const minMax = getMinMax(imageScalarData);
        const intercept = modalityLutModule.rescaleIntercept
            ? modalityLutModule.rescaleIntercept
            : 0;
        return {
            imageId,
            intercept,
            windowCenter,
            windowWidth,
            voiLUTFunction,
            color,
            rgba: false,
            numComps: numComponents,
            rows: dimensions[1],
            columns: dimensions[0],
            sizeInBytes: imageScalarData.byteLength,
            getPixelData: () => imageScalarData,
            minPixelValue: minMax.min,
            maxPixelValue: minMax.max,
            slope: modalityLutModule.rescaleSlope
                ? modalityLutModule.rescaleSlope
                : 1,
            getCanvas: undefined,
            height: dimensions[0],
            width: dimensions[1],
            columnPixelSpacing: spacing[0],
            rowPixelSpacing: spacing[1],
            invert,
            photometricInterpretation,
        };
    }
    convertToCornerstoneImage(imageId, imageIdIndex) {
        return this.getCornerstoneImageLoadObject(imageId, imageIdIndex);
    }
    getCornerstoneImageLoadObject(imageId, imageIdIndex) {
        const image = this.getCornerstoneImage(imageId, imageIdIndex);
        const imageLoadObject = {
            promise: Promise.resolve(image),
        };
        return imageLoadObject;
    }
    getCornerstoneImages() {
        const { imageIds } = this;
        return imageIds.map((imageId, imageIdIndex) => {
            return this.getCornerstoneImage(imageId, imageIdIndex);
        });
    }
    _convertToImages() {
        const byteLength = this.sizeInBytes;
        const numImages = this.imageIds.length;
        const { bytesPerImage } = this.cornerstoneImageMetaData;
        let bytesRemaining = core_1.cache.decacheIfNecessaryUntilBytesAvailable(byteLength, this.imageIds);
        for (let imageIdIndex = 0; imageIdIndex < numImages; imageIdIndex++) {
            const imageId = this.imageIds[imageIdIndex];
            bytesRemaining = bytesRemaining - bytesPerImage;
            const imageLoadObject = this.convertToCornerstoneImage(imageId, imageIdIndex);
            if (!core_1.cache.getImageLoadObject(imageId)) {
                core_1.cache.putImageLoadObject(imageId, imageLoadObject).catch((err) => {
                    console.error(err);
                });
            }
            if (bytesRemaining <= bytesPerImage) {
                break;
            }
        }
        this._removeFromCache();
    }
    decache(completelyRemove = false) {
        if (completelyRemove) {
            this._removeFromCache();
        }
        else {
            this._convertToImages();
        }
    }
}
exports.default = BaseStreamingImageVolume;
//# sourceMappingURL=BaseStreamingImageVolume.js.map