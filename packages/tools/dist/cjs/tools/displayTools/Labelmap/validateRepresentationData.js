"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@cornerstonejs/core");
function validate(segmentationInput) {
    if (!segmentationInput.representation.data) {
        throw new Error('The segmentationInput.representationData.data is undefined, please provide a valid representationData.data');
    }
    const representationData = segmentationInput.representation
        .data;
    if (!representationData.volumeId) {
        throw new Error('The segmentationInput.representationData.volumeId is undefined, please provide a valid representationData.volumeId');
    }
    const cachedVolume = core_1.cache.getVolume(representationData.volumeId);
    if (!cachedVolume) {
        throw new Error(`volumeId of ${representationData.volumeId} not found in cache, you should load and cache volume before adding segmentation`);
    }
}
exports.default = validate;
//# sourceMappingURL=validateRepresentationData.js.map