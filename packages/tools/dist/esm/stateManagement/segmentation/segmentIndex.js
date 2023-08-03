import { getSegmentation } from './segmentationState';
import { triggerSegmentationModified } from './triggerSegmentationEvents';
function setActiveSegmentIndex(segmentationId, segmentIndex) {
    const segmentation = getSegmentation(segmentationId);
    if (segmentation?.activeSegmentIndex !== segmentIndex) {
        segmentation.activeSegmentIndex = segmentIndex;
        triggerSegmentationModified(segmentationId);
    }
}
function getActiveSegmentIndex(segmentationId) {
    const segmentation = getSegmentation(segmentationId);
    if (segmentation) {
        return segmentation.activeSegmentIndex;
    }
}
export { getActiveSegmentIndex, setActiveSegmentIndex };
//# sourceMappingURL=segmentIndex.js.map