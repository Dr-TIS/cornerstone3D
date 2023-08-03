"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setActiveSegmentationRepresentation = exports.getActiveSegmentationRepresentation = void 0;
const segmentationState_1 = require("./segmentationState");
const triggerSegmentationEvents_1 = require("./triggerSegmentationEvents");
function getActiveSegmentationRepresentation(toolGroupId) {
    const segmentationStateManager = (0, segmentationState_1.getDefaultSegmentationStateManager)();
    const toolGroupSegmentationRepresentations = segmentationStateManager.getSegmentationRepresentations(toolGroupId);
    if (!toolGroupSegmentationRepresentations) {
        return;
    }
    const activeRepresentation = toolGroupSegmentationRepresentations.find((representation) => representation.active);
    return activeRepresentation;
}
exports.getActiveSegmentationRepresentation = getActiveSegmentationRepresentation;
function setActiveSegmentationRepresentation(toolGroupId, segmentationRepresentationUID) {
    const segmentationStateManager = (0, segmentationState_1.getDefaultSegmentationStateManager)();
    segmentationStateManager.setActiveSegmentationRepresentation(toolGroupId, segmentationRepresentationUID);
    (0, triggerSegmentationEvents_1.triggerSegmentationRepresentationModified)(toolGroupId, segmentationRepresentationUID);
}
exports.setActiveSegmentationRepresentation = setActiveSegmentationRepresentation;
//# sourceMappingURL=activeSegmentation.js.map