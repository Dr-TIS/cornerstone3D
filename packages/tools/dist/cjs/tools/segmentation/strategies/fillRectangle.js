"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fillOutsideRectangle = exports.fillInsideRectangle = void 0;
const core_1 = require("@cornerstonejs/core");
const boundingBox_1 = require("../../../utilities/boundingBox");
const utilities_1 = require("../../../utilities");
const triggerSegmentationEvents_1 = require("../../../stateManagement/segmentation/triggerSegmentationEvents");
const { transformWorldToIndex } = core_1.utilities;
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
    const boundsIJK = (0, boundingBox_1.getBoundingBoxAroundShape)(rectangleCornersIJK, dimensions);
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
    (0, utilities_1.pointInShapeCallback)(imageData, pointInRectangle, callback, boundsIJK);
    (0, triggerSegmentationEvents_1.triggerSegmentationDataModified)(segmentationId);
}
function fillInsideRectangle(enabledElement, operationData) {
    fillRectangle(enabledElement, operationData, true);
}
exports.fillInsideRectangle = fillInsideRectangle;
function fillOutsideRectangle(enabledElement, operationData) {
    fillRectangle(enabledElement, operationData, false);
}
exports.fillOutsideRectangle = fillOutsideRectangle;
//# sourceMappingURL=fillRectangle.js.map