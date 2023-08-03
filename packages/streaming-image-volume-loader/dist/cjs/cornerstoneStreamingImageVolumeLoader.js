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
const core_1 = require("@cornerstonejs/core");
const gl_matrix_1 = require("gl-matrix");
const helpers_1 = require("./helpers");
const StreamingImageVolume_1 = __importDefault(require("./StreamingImageVolume"));
const { createUint8SharedArray, createFloat32SharedArray, createUint16SharedArray, createInt16SharedArray, } = core_1.utilities;
function cornerstoneStreamingImageVolumeLoader(volumeId, options) {
    if (!options || !options.imageIds || !options.imageIds.length) {
        throw new Error('ImageIds must be provided to create a streaming image volume');
    }
    const { useNorm16Texture, preferSizeOverAccuracy } = (0, core_1.getConfiguration)().rendering;
    const use16BitDataType = useNorm16Texture || preferSizeOverAccuracy;
    function getStreamingImageVolume() {
        return __awaiter(this, void 0, void 0, function* () {
            if (options.imageIds[0].split(':')[0] === 'wadouri') {
                const [middleImageIndex, lastImageIndex] = [
                    Math.floor(options.imageIds.length / 2),
                    options.imageIds.length - 1,
                ];
                const indexesToPrefetch = [0, middleImageIndex, lastImageIndex];
                yield Promise.all(indexesToPrefetch.map((index) => {
                    return new Promise((resolve, reject) => {
                        const imageId = options.imageIds[index];
                        core_1.imageLoadPoolManager.addRequest(() => __awaiter(this, void 0, void 0, function* () {
                            core_1.imageLoader
                                .loadImage(imageId)
                                .then(() => {
                                console.log(`Prefetched imageId: ${imageId}`);
                                resolve(true);
                            })
                                .catch((err) => {
                                reject(err);
                            });
                        }), core_1.Enums.RequestType.Prefetch, { volumeId }, 1);
                    });
                })).catch(console.error);
            }
            const { imageIds } = options;
            const volumeMetadata = (0, helpers_1.makeVolumeMetadata)(imageIds);
            const imageIdIndex = Math.floor(imageIds.length / 2);
            const imageId = imageIds[imageIdIndex];
            const scalingParameters = core_1.utilities.getScalingParameters(imageId);
            const hasNegativeRescale = scalingParameters.rescaleIntercept < 0 ||
                scalingParameters.rescaleSlope < 0;
            const { BitsAllocated, PixelRepresentation, PhotometricInterpretation, ImageOrientationPatient, PixelSpacing, Columns, Rows, } = volumeMetadata;
            const rowCosineVec = gl_matrix_1.vec3.fromValues(ImageOrientationPatient[0], ImageOrientationPatient[1], ImageOrientationPatient[2]);
            const colCosineVec = gl_matrix_1.vec3.fromValues(ImageOrientationPatient[3], ImageOrientationPatient[4], ImageOrientationPatient[5]);
            const scanAxisNormal = gl_matrix_1.vec3.create();
            gl_matrix_1.vec3.cross(scanAxisNormal, rowCosineVec, colCosineVec);
            const { zSpacing, origin, sortedImageIds } = (0, helpers_1.sortImageIdsAndGetSpacing)(imageIds, scanAxisNormal);
            const numFrames = imageIds.length;
            const spacing = [PixelSpacing[1], PixelSpacing[0], zSpacing];
            const dimensions = [Columns, Rows, numFrames];
            const direction = [
                ...rowCosineVec,
                ...colCosineVec,
                ...scanAxisNormal,
            ];
            const signed = PixelRepresentation === 1;
            const numComponents = PhotometricInterpretation === 'RGB' ? 3 : 1;
            const useSharedArrayBuffer = (0, core_1.getShouldUseSharedArrayBuffer)();
            const length = dimensions[0] * dimensions[1] * dimensions[2];
            const handleCache = (sizeInBytes) => {
                if (!core_1.cache.isCacheable(sizeInBytes)) {
                    throw new Error(core_1.Enums.Events.CACHE_SIZE_EXCEEDED);
                }
                core_1.cache.decacheIfNecessaryUntilBytesAvailable(sizeInBytes);
            };
            let scalarData, sizeInBytes;
            switch (BitsAllocated) {
                case 8:
                    if (signed) {
                        throw new Error('8 Bit signed images are not yet supported by this plugin.');
                    }
                    sizeInBytes = length * numComponents;
                    handleCache(sizeInBytes);
                    scalarData = useSharedArrayBuffer
                        ? createUint8SharedArray(length * numComponents)
                        : new Uint8Array(length * numComponents);
                    break;
                case 16:
                    if (!use16BitDataType) {
                        sizeInBytes = length * 4;
                        scalarData = useSharedArrayBuffer
                            ? createFloat32SharedArray(length)
                            : new Float32Array(length);
                        break;
                    }
                    sizeInBytes = length * 2;
                    if (signed || hasNegativeRescale) {
                        handleCache(sizeInBytes);
                        scalarData = useSharedArrayBuffer
                            ? createInt16SharedArray(length)
                            : new Int16Array(length);
                        break;
                    }
                    if (!signed && !hasNegativeRescale) {
                        handleCache(sizeInBytes);
                        scalarData = useSharedArrayBuffer
                            ? createUint16SharedArray(length)
                            : new Uint16Array(length);
                        break;
                    }
                    sizeInBytes = length * 4;
                    handleCache(sizeInBytes);
                    scalarData = useSharedArrayBuffer
                        ? createFloat32SharedArray(length)
                        : new Float32Array(length);
                    break;
                case 24:
                    sizeInBytes = length * numComponents;
                    handleCache(sizeInBytes);
                    scalarData = useSharedArrayBuffer
                        ? createUint8SharedArray(length * numComponents)
                        : new Uint8Array(length * numComponents);
                    break;
            }
            const streamingImageVolume = new StreamingImageVolume_1.default({
                volumeId,
                metadata: volumeMetadata,
                dimensions,
                spacing,
                origin,
                direction,
                scalarData,
                sizeInBytes,
            }, {
                imageIds: sortedImageIds,
                loadStatus: {
                    loaded: false,
                    loading: false,
                    cancelled: false,
                    cachedFrames: [],
                    callbacks: [],
                },
            });
            return streamingImageVolume;
        });
    }
    const streamingImageVolumePromise = getStreamingImageVolume();
    return {
        promise: streamingImageVolumePromise,
        decache: () => {
            streamingImageVolumePromise.then((streamingImageVolume) => {
                streamingImageVolume.destroy();
                streamingImageVolume = null;
            });
        },
        cancel: () => {
            streamingImageVolumePromise.then((streamingImageVolume) => {
                streamingImageVolume.cancelLoading();
            });
        },
    };
}
exports.default = cornerstoneStreamingImageVolumeLoader;
//# sourceMappingURL=cornerstoneStreamingImageVolumeLoader.js.map