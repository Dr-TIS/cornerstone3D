import { cache, utilities, Enums, imageLoader, imageLoadPoolManager, getShouldUseSharedArrayBuffer, getConfiguration, utilities as csUtils, } from '@cornerstonejs/core';
import { vec3 } from 'gl-matrix';
import { makeVolumeMetadata, sortImageIdsAndGetSpacing } from './helpers';
import StreamingImageVolume from './StreamingImageVolume';
const { createUint8SharedArray, createFloat32SharedArray, createUint16SharedArray, createInt16SharedArray, } = utilities;
function cornerstoneStreamingImageVolumeLoader(volumeId, options) {
    if (!options || !options.imageIds || !options.imageIds.length) {
        throw new Error('ImageIds must be provided to create a streaming image volume');
    }
    const { useNorm16Texture, preferSizeOverAccuracy } = getConfiguration().rendering;
    const use16BitDataType = useNorm16Texture || preferSizeOverAccuracy;
    async function getStreamingImageVolume() {
        if (options.imageIds[0].split(':')[0] === 'wadouri') {
            const [middleImageIndex, lastImageIndex] = [
                Math.floor(options.imageIds.length / 2),
                options.imageIds.length - 1,
            ];
            const indexesToPrefetch = [0, middleImageIndex, lastImageIndex];
            await Promise.all(indexesToPrefetch.map((index) => {
                return new Promise((resolve, reject) => {
                    const imageId = options.imageIds[index];
                    imageLoadPoolManager.addRequest(async () => {
                        imageLoader
                            .loadImage(imageId)
                            .then(() => {
                            console.log(`Prefetched imageId: ${imageId}`);
                            resolve(true);
                        })
                            .catch((err) => {
                            reject(err);
                        });
                    }, Enums.RequestType.Prefetch, { volumeId }, 1);
                });
            })).catch(console.error);
        }
        const { imageIds } = options;
        const volumeMetadata = makeVolumeMetadata(imageIds);
        const imageIdIndex = Math.floor(imageIds.length / 2);
        const imageId = imageIds[imageIdIndex];
        const scalingParameters = csUtils.getScalingParameters(imageId);
        const hasNegativeRescale = scalingParameters.rescaleIntercept < 0 ||
            scalingParameters.rescaleSlope < 0;
        const { BitsAllocated, PixelRepresentation, PhotometricInterpretation, ImageOrientationPatient, PixelSpacing, Columns, Rows, } = volumeMetadata;
        const rowCosineVec = vec3.fromValues(ImageOrientationPatient[0], ImageOrientationPatient[1], ImageOrientationPatient[2]);
        const colCosineVec = vec3.fromValues(ImageOrientationPatient[3], ImageOrientationPatient[4], ImageOrientationPatient[5]);
        const scanAxisNormal = vec3.create();
        vec3.cross(scanAxisNormal, rowCosineVec, colCosineVec);
        const { zSpacing, origin, sortedImageIds } = sortImageIdsAndGetSpacing(imageIds, scanAxisNormal);
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
        const useSharedArrayBuffer = getShouldUseSharedArrayBuffer();
        const length = dimensions[0] * dimensions[1] * dimensions[2];
        const handleCache = (sizeInBytes) => {
            if (!cache.isCacheable(sizeInBytes)) {
                throw new Error(Enums.Events.CACHE_SIZE_EXCEEDED);
            }
            cache.decacheIfNecessaryUntilBytesAvailable(sizeInBytes);
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
        const streamingImageVolume = new StreamingImageVolume({
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
export default cornerstoneStreamingImageVolumeLoader;
//# sourceMappingURL=cornerstoneStreamingImageVolumeLoader.js.map