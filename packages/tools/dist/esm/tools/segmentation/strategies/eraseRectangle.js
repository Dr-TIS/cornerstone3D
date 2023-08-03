import { utilities as csUtils } from '@cornerstonejs/core';
import { getBoundingBoxAroundShape } from '../../../utilities/boundingBox';
import { triggerSegmentationDataModified } from '../../../stateManagement/segmentation/triggerSegmentationEvents';
import { pointInShapeCallback } from '../../../utilities';
const { transformWorldToIndex } = csUtils;
function eraseRectangle(enabledElement, operationData, inside = true) {
    const { volume: segmentation, points, segmentsLocked, segmentationId, } = operationData;
    const { imageData, dimensions } = segmentation;
    const scalarData = segmentation.getScalarData();
    const rectangleCornersIJK = points.map((world) => {
        return transformWorldToIndex(imageData, world);
    });
    const boundsIJK = getBoundingBoxAroundShape(rectangleCornersIJK, dimensions);
    const pointInShape = () => true;
    const callback = ({ value, index }) => {
        if (segmentsLocked.includes(value)) {
            return;
        }
        scalarData[index] = 0;
    };
    pointInShapeCallback(imageData, pointInShape, callback, boundsIJK);
    triggerSegmentationDataModified(segmentationId);
}
export function eraseInsideRectangle(enabledElement, operationData) {
    eraseRectangle(enabledElement, operationData, true);
}
export function eraseOutsideRectangle(enabledElement, operationData) {
    eraseRectangle(enabledElement, operationData, false);
}
//# sourceMappingURL=eraseRectangle.js.map