"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eraseOutsideRectangle = exports.eraseInsideRectangle = void 0;
const core_1 = require("@cornerstonejs/core");
const boundingBox_1 = require("../../../utilities/boundingBox");
const triggerSegmentationEvents_1 = require("../../../stateManagement/segmentation/triggerSegmentationEvents");
const utilities_1 = require("../../../utilities");
const { transformWorldToIndex } = core_1.utilities;
function eraseRectangle(enabledElement, operationData, inside = true) {
    const { volume: segmentation, points, segmentsLocked, segmentationId, } = operationData;
    const { imageData, dimensions } = segmentation;
    const scalarData = segmentation.getScalarData();
    const rectangleCornersIJK = points.map((world) => {
        return transformWorldToIndex(imageData, world);
    });
    const boundsIJK = (0, boundingBox_1.getBoundingBoxAroundShape)(rectangleCornersIJK, dimensions);
    const pointInShape = () => true;
    const callback = ({ value, index }) => {
        if (segmentsLocked.includes(value)) {
            return;
        }
        scalarData[index] = 0;
    };
    (0, utilities_1.pointInShapeCallback)(imageData, pointInShape, callback, boundsIJK);
    (0, triggerSegmentationEvents_1.triggerSegmentationDataModified)(segmentationId);
}
function eraseInsideRectangle(enabledElement, operationData) {
    eraseRectangle(enabledElement, operationData, true);
}
exports.eraseInsideRectangle = eraseInsideRectangle;
function eraseOutsideRectangle(enabledElement, operationData) {
    eraseRectangle(enabledElement, operationData, false);
}
exports.eraseOutsideRectangle = eraseOutsideRectangle;
//# sourceMappingURL=eraseRectangle.js.map