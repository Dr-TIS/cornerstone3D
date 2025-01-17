"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("./helpers");
const StreamingDynamicImageVolume_1 = __importDefault(require("./StreamingDynamicImageVolume"));
function get4DVolumeInfo(imageIds) {
    const imageIdsGroups = (0, helpers_1.splitImageIdsBy4DTags)(imageIds);
    return imageIdsGroups.map((imageIds) => (0, helpers_1.getVolumeInfo)(imageIds));
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
    let streamingImageVolume = new StreamingDynamicImageVolume_1.default({
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
exports.default = cornerstoneStreamingDynamicImageVolumeLoader;
//# sourceMappingURL=cornerstoneStreamingDynamicImageVolumeLoader.js.map