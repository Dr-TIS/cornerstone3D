"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fillOutsideCircle = exports.thresholdInsideCircle = exports.fillInsideCircle = void 0;
const gl_matrix_1 = require("gl-matrix");
const core_1 = require("@cornerstonejs/core");
const ellipse_1 = require("../../../utilities/math/ellipse");
const boundingBox_1 = require("../../../utilities/boundingBox");
const triggerSegmentationEvents_1 = require("../../../stateManagement/segmentation/triggerSegmentationEvents");
const utilities_1 = require("../../../utilities");
const { transformWorldToIndex } = core_1.utilities;
function fillCircle(enabledElement, operationData, threshold = false) {
    const { volume: segmentationVolume, imageVolume, points, segmentsLocked, segmentIndex, segmentationId, strategySpecificConfiguration, } = operationData;
    const { imageData, dimensions } = segmentationVolume;
    const scalarData = segmentationVolume.getScalarData();
    const { viewport } = enabledElement;
    const center = gl_matrix_1.vec3.fromValues(0, 0, 0);
    points.forEach((point) => {
        gl_matrix_1.vec3.add(center, center, point);
    });
    gl_matrix_1.vec3.scale(center, center, 1 / points.length);
    const canvasCoordinates = points.map((p) => viewport.worldToCanvas(p));
    const [topLeftCanvas, bottomRightCanvas] = (0, ellipse_1.getCanvasEllipseCorners)(canvasCoordinates);
    const topLeftWorld = viewport.canvasToWorld(topLeftCanvas);
    const bottomRightWorld = viewport.canvasToWorld(bottomRightCanvas);
    const ellipsoidCornersIJK = [
        transformWorldToIndex(imageData, topLeftWorld),
        transformWorldToIndex(imageData, bottomRightWorld),
    ];
    const boundsIJK = (0, boundingBox_1.getBoundingBoxAroundShape)(ellipsoidCornersIJK, dimensions);
    const ellipseObj = {
        center: center,
        xRadius: Math.abs(topLeftWorld[0] - bottomRightWorld[0]) / 2,
        yRadius: Math.abs(topLeftWorld[1] - bottomRightWorld[1]) / 2,
        zRadius: Math.abs(topLeftWorld[2] - bottomRightWorld[2]) / 2,
    };
    const modifiedSlicesToUse = new Set();
    let callback;
    if (threshold) {
        callback = ({ value, index, pointIJK }) => {
            if (segmentsLocked.includes(value)) {
                return;
            }
            if (isWithinThreshold(index, imageVolume, strategySpecificConfiguration)) {
                scalarData[index] = segmentIndex;
                modifiedSlicesToUse.add(pointIJK[2]);
            }
        };
    }
    else {
        callback = ({ value, index, pointIJK }) => {
            if (segmentsLocked.includes(value)) {
                return;
            }
            scalarData[index] = segmentIndex;
            modifiedSlicesToUse.add(pointIJK[2]);
        };
    }
    (0, utilities_1.pointInShapeCallback)(imageData, (pointLPS, pointIJK) => (0, ellipse_1.pointInEllipse)(ellipseObj, pointLPS), callback, boundsIJK);
    const arrayOfSlices = Array.from(modifiedSlicesToUse);
    (0, triggerSegmentationEvents_1.triggerSegmentationDataModified)(segmentationId, arrayOfSlices);
}
function isWithinThreshold(index, imageVolume, strategySpecificConfiguration) {
    const { THRESHOLD_INSIDE_CIRCLE } = strategySpecificConfiguration;
    const voxelValue = imageVolume.getScalarData()[index];
    const { threshold } = THRESHOLD_INSIDE_CIRCLE;
    return threshold[0] <= voxelValue && voxelValue <= threshold[1];
}
function fillInsideCircle(enabledElement, operationData) {
    fillCircle(enabledElement, operationData, false);
}
exports.fillInsideCircle = fillInsideCircle;
function thresholdInsideCircle(enabledElement, operationData) {
    const { volume, imageVolume } = operationData;
    if (!core_1.utilities.isEqual(volume.dimensions, imageVolume.dimensions) ||
        !core_1.utilities.isEqual(volume.direction, imageVolume.direction)) {
        throw new Error('Only source data the same dimensions/size/orientation as the segmentation currently supported.');
    }
    fillCircle(enabledElement, operationData, true);
}
exports.thresholdInsideCircle = thresholdInsideCircle;
function fillOutsideCircle(enabledElement, operationData) {
    throw new Error('Not yet implemented');
}
exports.fillOutsideCircle = fillOutsideCircle;
//# sourceMappingURL=fillCircle.js.map