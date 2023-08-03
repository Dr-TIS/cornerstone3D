"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fillOutsideSphere = exports.fillInsideSphere = void 0;
const triggerSegmentationEvents_1 = require("../../../stateManagement/segmentation/triggerSegmentationEvents");
const utilities_1 = require("../../../utilities");
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
    (0, utilities_1.pointInSurroundingSphereCallback)(imageData, [points[0], points[1]], callback, viewport);
    const zMultiple = dimensions[0] * dimensions[1];
    const minSlice = Math.floor(scalarIndex[0] / zMultiple);
    const maxSlice = Math.floor(scalarIndex[scalarIndex.length - 1] / zMultiple);
    const sliceArray = Array.from({ length: maxSlice - minSlice + 1 }, (v, k) => k + minSlice);
    (0, triggerSegmentationEvents_1.triggerSegmentationDataModified)(segmentationId, sliceArray);
}
function fillInsideSphere(enabledElement, operationData) {
    fillSphere(enabledElement, operationData, true);
}
exports.fillInsideSphere = fillInsideSphere;
function fillOutsideSphere(enabledElement, operationData) {
    fillSphere(enabledElement, operationData, false);
}
exports.fillOutsideSphere = fillOutsideSphere;
//# sourceMappingURL=fillSphere.js.map