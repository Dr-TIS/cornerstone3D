"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cache = void 0;
const utilities_1 = require("../utilities");
const eventTarget_1 = __importDefault(require("../eventTarget"));
const Events_1 = __importDefault(require("../enums/Events"));
const MAX_CACHE_SIZE_1GB = 1073741824;
class Cache {
    constructor() {
        this.setMaxCacheSize = (newMaxCacheSize) => {
            if (!newMaxCacheSize || typeof newMaxCacheSize !== 'number') {
                const errorMessage = `New max cacheSize ${this._maxCacheSize} should be defined and should be a number.`;
                throw new Error(errorMessage);
            }
            this._maxCacheSize = newMaxCacheSize;
        };
        this.isCacheable = (byteLength) => {
            const unallocatedSpace = this.getBytesAvailable();
            const imageCacheSize = this._imageCacheSize;
            const availableSpace = unallocatedSpace + imageCacheSize;
            return availableSpace > byteLength;
        };
        this.getMaxCacheSize = () => this._maxCacheSize;
        this.getCacheSize = () => this._imageCacheSize + this._volumeCacheSize;
        this._decacheImage = (imageId) => {
            const { imageLoadObject } = this._imageCache.get(imageId);
            if (imageLoadObject.cancelFn) {
                imageLoadObject.cancelFn();
            }
            if (imageLoadObject.decache) {
                imageLoadObject.decache();
            }
            this._imageCache.delete(imageId);
        };
        this._decacheVolume = (volumeId) => {
            const cachedVolume = this._volumeCache.get(volumeId);
            const { volumeLoadObject, volume } = cachedVolume;
            if (volume.cancelLoading) {
                volume.cancelLoading();
            }
            if (volume.imageData) {
                volume.imageData.delete();
            }
            if (volumeLoadObject.cancelFn) {
                volumeLoadObject.cancelFn();
            }
            if (volumeLoadObject.decache) {
                volumeLoadObject.decache();
            }
            this._volumeCache.delete(volumeId);
        };
        this.purgeCache = () => {
            const imageIterator = this._imageCache.keys();
            while (true) {
                const { value: imageId, done } = imageIterator.next();
                if (done) {
                    break;
                }
                this.removeImageLoadObject(imageId);
                (0, utilities_1.triggerEvent)(eventTarget_1.default, Events_1.default.IMAGE_CACHE_IMAGE_REMOVED, { imageId });
            }
            this.purgeVolumeCache();
        };
        this.purgeVolumeCache = () => {
            const volumeIterator = this._volumeCache.keys();
            while (true) {
                const { value: volumeId, done } = volumeIterator.next();
                if (done) {
                    break;
                }
                this.removeVolumeLoadObject(volumeId);
                (0, utilities_1.triggerEvent)(eventTarget_1.default, Events_1.default.VOLUME_CACHE_VOLUME_REMOVED, {
                    volumeId,
                });
            }
        };
        this.getVolumeLoadObject = (volumeId) => {
            if (volumeId === undefined) {
                throw new Error('getVolumeLoadObject: volumeId must not be undefined');
            }
            const cachedVolume = this._volumeCache.get(volumeId);
            if (cachedVolume === undefined) {
                return;
            }
            cachedVolume.timeStamp = Date.now();
            return cachedVolume.volumeLoadObject;
        };
        this.getGeometry = (geometryId) => {
            if (geometryId == null) {
                throw new Error('getGeometry: geometryId must not be undefined');
            }
            const cachedGeometry = this._geometryCache.get(geometryId);
            if (cachedGeometry === undefined) {
                return;
            }
            cachedGeometry.timeStamp = Date.now();
            return cachedGeometry.geometry;
        };
        this.getVolume = (volumeId) => {
            if (volumeId === undefined) {
                throw new Error('getVolume: volumeId must not be undefined');
            }
            const cachedVolume = this._volumeCache.get(volumeId);
            if (cachedVolume === undefined) {
                return;
            }
            cachedVolume.timeStamp = Date.now();
            return cachedVolume.volume;
        };
        this.removeImageLoadObject = (imageId) => {
            if (imageId === undefined) {
                throw new Error('removeImageLoadObject: imageId must not be undefined');
            }
            const cachedImage = this._imageCache.get(imageId);
            if (cachedImage === undefined) {
                throw new Error('removeImageLoadObject: imageId was not present in imageCache');
            }
            this._incrementImageCacheSize(-cachedImage.sizeInBytes);
            const eventDetails = {
                imageId,
            };
            (0, utilities_1.triggerEvent)(eventTarget_1.default, Events_1.default.IMAGE_CACHE_IMAGE_REMOVED, eventDetails);
            this._decacheImage(imageId);
        };
        this.removeVolumeLoadObject = (volumeId) => {
            if (volumeId === undefined) {
                throw new Error('removeVolumeLoadObject: volumeId must not be undefined');
            }
            const cachedVolume = this._volumeCache.get(volumeId);
            if (cachedVolume === undefined) {
                throw new Error('removeVolumeLoadObject: volumeId was not present in volumeCache');
            }
            this._incrementVolumeCacheSize(-cachedVolume.sizeInBytes);
            const eventDetails = {
                volume: cachedVolume,
                volumeId,
            };
            (0, utilities_1.triggerEvent)(eventTarget_1.default, Events_1.default.VOLUME_CACHE_VOLUME_REMOVED, eventDetails);
            this._decacheVolume(volumeId);
        };
        this.putGeometryLoadObject = (geometryId, geometryLoadObject) => {
            if (geometryId == undefined) {
                throw new Error('putGeometryLoadObject: geometryId must not be undefined');
            }
            if (this._geometryCache.has(geometryId)) {
                throw new Error('putGeometryLoadObject: geometryId already present in geometryCache');
            }
            const cachedGeometry = {
                geometryId,
                geometryLoadObject,
                loaded: false,
                timeStamp: Date.now(),
                sizeInBytes: 0,
            };
            this._geometryCache.set(geometryId, cachedGeometry);
            return geometryLoadObject.promise
                .then((geometry) => {
                if (!this._geometryCache.has(geometryId)) {
                    console.warn('putGeometryLoadObject: geometryId was removed from geometryCache');
                    return;
                }
                if (Number.isNaN(geometry.sizeInBytes)) {
                    throw new Error('putGeometryLoadObject: geometry.sizeInBytes is not a number');
                }
                cachedGeometry.loaded = true;
                cachedGeometry.geometry = geometry;
                cachedGeometry.sizeInBytes = geometry.sizeInBytes;
                const eventDetails = {
                    geometry,
                    geometryId,
                };
                (0, utilities_1.triggerEvent)(eventTarget_1.default, Events_1.default.GEOMETRY_CACHE_GEOMETRY_ADDED, eventDetails);
                return;
            })
                .catch((error) => {
                this._geometryCache.delete(geometryId);
                throw error;
            });
        };
        this._incrementImageCacheSize = (increment) => {
            this._imageCacheSize += increment;
        };
        this._incrementVolumeCacheSize = (increment) => {
            this._volumeCacheSize += increment;
        };
        this._imageCache = new Map();
        this._volumeCache = new Map();
        this._geometryCache = new Map();
        this._imageCacheSize = 0;
        this._volumeCacheSize = 0;
        this._maxCacheSize = MAX_CACHE_SIZE_1GB;
    }
    getBytesAvailable() {
        return this.getMaxCacheSize() - this.getCacheSize();
    }
    decacheIfNecessaryUntilBytesAvailable(numBytes, volumeImageIds) {
        let bytesAvailable = this.getBytesAvailable();
        if (bytesAvailable >= numBytes) {
            return bytesAvailable;
        }
        let cachedImages = Array.from(this._imageCache.values());
        function compare(a, b) {
            if (a.timeStamp > b.timeStamp) {
                return 1;
            }
            if (a.timeStamp < b.timeStamp) {
                return -1;
            }
            return 0;
        }
        cachedImages.sort(compare);
        let cachedImageIds = cachedImages.map((im) => im.imageId);
        let imageIdsToPurge = cachedImageIds;
        if (volumeImageIds) {
            imageIdsToPurge = cachedImageIds.filter((id) => !volumeImageIds.includes(id));
        }
        for (const imageId of imageIdsToPurge) {
            this.removeImageLoadObject(imageId);
            (0, utilities_1.triggerEvent)(eventTarget_1.default, Events_1.default.IMAGE_CACHE_IMAGE_REMOVED, { imageId });
            bytesAvailable = this.getBytesAvailable();
            if (bytesAvailable >= numBytes) {
                return bytesAvailable;
            }
        }
        cachedImages = Array.from(this._imageCache.values());
        cachedImageIds = cachedImages.map((im) => im.imageId);
        for (const imageId of cachedImageIds) {
            this.removeImageLoadObject(imageId);
            (0, utilities_1.triggerEvent)(eventTarget_1.default, Events_1.default.IMAGE_CACHE_IMAGE_REMOVED, { imageId });
            bytesAvailable = this.getBytesAvailable();
            if (bytesAvailable >= numBytes) {
                return bytesAvailable;
            }
        }
    }
    putImageLoadObject(imageId, imageLoadObject) {
        if (imageId === undefined) {
            throw new Error('putImageLoadObject: imageId must not be undefined');
        }
        if (imageLoadObject.promise === undefined) {
            throw new Error('putImageLoadObject: imageLoadObject.promise must not be undefined');
        }
        if (this._imageCache.has(imageId)) {
            throw new Error('putImageLoadObject: imageId already in cache');
        }
        if (imageLoadObject.cancelFn &&
            typeof imageLoadObject.cancelFn !== 'function') {
            throw new Error('putImageLoadObject: imageLoadObject.cancel must be a function');
        }
        const cachedImage = {
            loaded: false,
            imageId,
            sharedCacheKey: undefined,
            imageLoadObject,
            timeStamp: Date.now(),
            sizeInBytes: 0,
        };
        this._imageCache.set(imageId, cachedImage);
        return imageLoadObject.promise
            .then((image) => {
            if (!this._imageCache.get(imageId)) {
                console.warn('The image was purged from the cache before it completed loading.');
                return;
            }
            if (Number.isNaN(image.sizeInBytes)) {
                throw new Error('putImageLoadObject: image.sizeInBytes must not be undefined');
            }
            if (image.sizeInBytes.toFixed === undefined) {
                throw new Error('putImageLoadObject: image.sizeInBytes is not a number');
            }
            if (!this.isCacheable(image.sizeInBytes)) {
                throw new Error(Events_1.default.CACHE_SIZE_EXCEEDED);
            }
            this.decacheIfNecessaryUntilBytesAvailable(image.sizeInBytes);
            cachedImage.loaded = true;
            cachedImage.image = image;
            cachedImage.sizeInBytes = image.sizeInBytes;
            this._incrementImageCacheSize(cachedImage.sizeInBytes);
            const eventDetails = {
                image: cachedImage,
            };
            (0, utilities_1.triggerEvent)(eventTarget_1.default, Events_1.default.IMAGE_CACHE_IMAGE_ADDED, eventDetails);
            cachedImage.sharedCacheKey = image.sharedCacheKey;
        })
            .catch((error) => {
            this._imageCache.delete(imageId);
            throw error;
        });
    }
    getImageLoadObject(imageId) {
        if (imageId === undefined) {
            throw new Error('getImageLoadObject: imageId must not be undefined');
        }
        const cachedImage = this._imageCache.get(imageId);
        if (cachedImage === undefined) {
            return;
        }
        cachedImage.timeStamp = Date.now();
        return cachedImage.imageLoadObject;
    }
    isImageIdCached(imageId) {
        const cachedImage = this._imageCache.get(imageId);
        if (!cachedImage) {
            return false;
        }
        return cachedImage.loaded;
    }
    getVolumeContainingImageId(imageId) {
        var _a;
        const volumeIds = Array.from(this._volumeCache.keys());
        const imageIdToUse = (0, utilities_1.imageIdToURI)(imageId);
        for (const volumeId of volumeIds) {
            const cachedVolume = this._volumeCache.get(volumeId);
            const { volume } = cachedVolume;
            if (!((_a = volume === null || volume === void 0 ? void 0 : volume.imageIds) === null || _a === void 0 ? void 0 : _a.length)) {
                return;
            }
            const imageIdIndex = volume.getImageURIIndex(imageIdToUse);
            if (imageIdIndex > -1) {
                return { volume, imageIdIndex };
            }
        }
    }
    getCachedImageBasedOnImageURI(imageId) {
        const imageURIToUse = (0, utilities_1.imageIdToURI)(imageId);
        const cachedImageIds = Array.from(this._imageCache.keys());
        const foundImageId = cachedImageIds.find((imageId) => {
            return (0, utilities_1.imageIdToURI)(imageId) === imageURIToUse;
        });
        if (!foundImageId) {
            return;
        }
        return this._imageCache.get(foundImageId);
    }
    putVolumeLoadObject(volumeId, volumeLoadObject) {
        if (volumeId === undefined) {
            throw new Error('putVolumeLoadObject: volumeId must not be undefined');
        }
        if (volumeLoadObject.promise === undefined) {
            throw new Error('putVolumeLoadObject: volumeLoadObject.promise must not be undefined');
        }
        if (this._volumeCache.has(volumeId)) {
            throw new Error(`putVolumeLoadObject: volumeId:${volumeId} already in cache`);
        }
        if (volumeLoadObject.cancelFn &&
            typeof volumeLoadObject.cancelFn !== 'function') {
            throw new Error('putVolumeLoadObject: volumeLoadObject.cancel must be a function');
        }
        const cachedVolume = {
            loaded: false,
            volumeId,
            volumeLoadObject,
            timeStamp: Date.now(),
            sizeInBytes: 0,
        };
        this._volumeCache.set(volumeId, cachedVolume);
        return volumeLoadObject.promise
            .then((volume) => {
            if (!this._volumeCache.get(volumeId)) {
                console.warn('The image was purged from the cache before it completed loading.');
                return;
            }
            if (Number.isNaN(volume.sizeInBytes)) {
                throw new Error('putVolumeLoadObject: volume.sizeInBytes must not be undefined');
            }
            if (volume.sizeInBytes.toFixed === undefined) {
                throw new Error('putVolumeLoadObject: volume.sizeInBytes is not a number');
            }
            this.decacheIfNecessaryUntilBytesAvailable(volume.sizeInBytes, volume.imageIds);
            cachedVolume.volume = volume;
            cachedVolume.sizeInBytes = volume.sizeInBytes;
            this._incrementVolumeCacheSize(cachedVolume.sizeInBytes);
            const eventDetails = {
                volume: cachedVolume,
            };
            (0, utilities_1.triggerEvent)(eventTarget_1.default, Events_1.default.VOLUME_CACHE_VOLUME_ADDED, eventDetails);
        })
            .catch((error) => {
            this._volumeCache.delete(volumeId);
            throw error;
        });
    }
}
exports.Cache = Cache;
const cache = new Cache();
exports.default = cache;
//# sourceMappingURL=cache.js.map