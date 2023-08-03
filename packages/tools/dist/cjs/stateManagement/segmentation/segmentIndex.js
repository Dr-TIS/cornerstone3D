"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setActiveSegmentIndex = exports.getActiveSegmentIndex = void 0;
const segmentationState_1 = require("./segmentationState");
const triggerSegmentationEvents_1 = require("./triggerSegmentationEvents");
function setActiveSegmentIndex(segmentationId, segmentIndex) {
    const segmentation = (0, segmentationState_1.getSegmentation)(segmentationId);
    if ((segmentation === null || segmentation === void 0 ? void 0 : segmentation.activeSegmentIndex) !== segmentIndex) {
        segmentation.activeSegmentIndex = segmentIndex;
        (0, triggerSegmentationEvents_1.triggerSegmentationModified)(segmentationId);
    }
}
exports.setActiveSegmentIndex = setActiveSegmentIndex;
function getActiveSegmentIndex(segmentationId) {
    const segmentation = (0, segmentationState_1.getSegmentation)(segmentationId);
    if (segmentation) {
        return segmentation.activeSegmentIndex;
    }
}
exports.getActiveSegmentIndex = getActiveSegmentIndex;
//# sourceMappingURL=segmentIndex.js.map