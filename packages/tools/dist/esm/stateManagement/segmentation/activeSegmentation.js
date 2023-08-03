import { getDefaultSegmentationStateManager } from './segmentationState';
import { triggerSegmentationRepresentationModified } from './triggerSegmentationEvents';
function getActiveSegmentationRepresentation(toolGroupId) {
    const segmentationStateManager = getDefaultSegmentationStateManager();
    const toolGroupSegmentationRepresentations = segmentationStateManager.getSegmentationRepresentations(toolGroupId);
    if (!toolGroupSegmentationRepresentations) {
        return;
    }
    const activeRepresentation = toolGroupSegmentationRepresentations.find((representation) => representation.active);
    return activeRepresentation;
}
function setActiveSegmentationRepresentation(toolGroupId, segmentationRepresentationUID) {
    const segmentationStateManager = getDefaultSegmentationStateManager();
    segmentationStateManager.setActiveSegmentationRepresentation(toolGroupId, segmentationRepresentationUID);
    triggerSegmentationRepresentationModified(toolGroupId, segmentationRepresentationUID);
}
export { getActiveSegmentationRepresentation, setActiveSegmentationRepresentation, };
//# sourceMappingURL=activeSegmentation.js.map