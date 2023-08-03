import { utilities as csUtils } from '@cornerstonejs/core';
import { getBoundingBoxAroundShape } from '../../../utilities/boundingBox';
import { pointInShapeCallback } from '../../../utilities';
import { triggerSegmentationDataModified } from '../../../stateManagement/segmentation/triggerSegmentationEvents';
const { transformWorldToIndex } = csUtils;
function fillRectangle(enabledElement, operationData, inside = true) {
    const { volume: segmentation, points, segmentsLocked, segmentIndex, segmentationId, constraintFn, } = operationData;
    const { imageData, dimensions } = segmentation;
    const scalarData = segmentation.getScalarData();
    let rectangleCornersIJK = points.map((world) => {
        return transformWorldToIndex(imageData, world);
    });
    rectangleCornersIJK = rectangleCornersIJK.map((point) => {
        return point.map((coord) => {
            return Math.round(coord);
        });
    });
    const boundsIJK = getBoundingBoxAroundShape(rectangleCornersIJK, dimensions);
    const pointInRectangle = () => true;
    const callback = ({ value, index, pointIJK }) => {
        if (segmentsLocked.includes(value)) {
            return;
        }
        if (!constraintFn) {
            scalarData[index] = segmentIndex;
            return;
        }
        if (constraintFn(pointIJK)) {
            scalarData[index] = segmentIndex;
        }
    };
    pointInShapeCallback(imageData, pointInRectangle, callback, boundsIJK);
    triggerSegmentationDataModified(segmentationId);
}
export function fillInsideRectangle(enabledElement, operationData) {
    fillRectangle(enabledElement, operationData, true);
}
export function fillOutsideRectangle(enabledElement, operationData) {
    fillRectangle(enabledElement, operationData, false);
}
//# sourceMappingURL=fillRectangle.js.map