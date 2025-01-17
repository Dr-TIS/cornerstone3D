import { getVolumeInfo, splitImageIdsBy4DTags } from './helpers';
import StreamingDynamicImageVolume from './StreamingDynamicImageVolume';
function get4DVolumeInfo(imageIds) {
    const imageIdsGroups = splitImageIdsBy4DTags(imageIds);
    return imageIdsGroups.map((imageIds) => getVolumeInfo(imageIds));
}
function cornerstoneStreamingDynamicImageVolumeLoader(volumeId, options) {
    if (!options || !options.imageIds || !options.imageIds.length) {
        throw new Error('ImageIds must be provided to create a 4D streaming image volume');
    }
    const { imageIds } = options;
    const volumesInfo = get4DVolumeInfo(imageIds);
    const { metadata: volumeMetadata, dimensions, spacing, origin, direction, sizeInBytes, } = volumesInfo[0];
    const sortedImageIdsArrays = [];
    const scalarDataArrays = [];
    volumesInfo.forEach((volumeInfo) => {
        sortedImageIdsArrays.push(volumeInfo.sortedImageIds);
        scalarDataArrays.push(volumeInfo.scalarData);
    });
    let streamingImageVolume = new StreamingDynamicImageVolume({
        volumeId,
        metadata: volumeMetadata,
        dimensions,
        spacing,
        origin,
        direction,
        scalarData: scalarDataArrays,
        sizeInBytes,
    }, {
        imageIds: sortedImageIdsArrays.flat(),
        loadStatus: {
            loaded: false,
            loading: false,
            cancelled: false,
            cachedFrames: [],
            callbacks: [],
        },
    });
    return {
        promise: Promise.resolve(streamingImageVolume),
        decache: () => {
            streamingImageVolume.destroy();
            streamingImageVolume = null;
        },
        cancel: () => {
            streamingImageVolume.cancelLoading();
        },
    };
}
export default cornerstoneStreamingDynamicImageVolumeLoader;
//# sourceMappingURL=cornerstoneStreamingDynamicImageVolumeLoader.js.map