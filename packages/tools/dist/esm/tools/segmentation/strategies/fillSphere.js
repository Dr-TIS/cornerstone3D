import { triggerSegmentationDataModified } from '../../../stateManagement/segmentation/triggerSegmentationEvents';
import { pointInSurroundingSphereCallback } from '../../../utilities';
function fillSphere(enabledElement, operationData, _inside = true) {
    const { viewport } = enabledElement;
    const { volume: segmentation, segmentsLocked, segmentIndex, segmentationId, points, } = operationData;
    const { imageData, dimensions } = segmentation;
    const scalarData = segmentation.getScalarData();
    const scalarIndex = [];
    const callback = ({ index, value }) => {
        if (segmentsLocked.includes(value)) {
            return;
        }
        scalarData[index] = segmentIndex;
        scalarIndex.push(index);
    };
    pointInSurroundingSphereCallback(imageData, [points[0], points[1]], callback, viewport);
    const zMultiple = dimensions[0] * dimensions[1];
    const minSlice = Math.floor(scalarIndex[0] / zMultiple);
    const maxSlice = Math.floor(scalarIndex[scalarIndex.length - 1] / zMultiple);
    const sliceArray = Array.from({ length: maxSlice - minSlice + 1 }, (v, k) => k + minSlice);
    triggerSegmentationDataModified(segmentationId, sliceArray);
}
export function fillInsideSphere(enabledElement, operationData) {
    fillSphere(enabledElement, operationData, true);
}
export function fillOutsideSphere(enabledElement, operationData) {
    fillSphere(enabledElement, operationData, false);
}
//# sourceMappingURL=fillSphere.js.map