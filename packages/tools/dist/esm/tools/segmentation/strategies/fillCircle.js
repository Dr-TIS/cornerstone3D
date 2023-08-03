import { vec3 } from 'gl-matrix';
import { utilities as csUtils } from '@cornerstonejs/core';
import { getCanvasEllipseCorners, pointInEllipse, } from '../../../utilities/math/ellipse';
import { getBoundingBoxAroundShape } from '../../../utilities/boundingBox';
import { triggerSegmentationDataModified } from '../../../stateManagement/segmentation/triggerSegmentationEvents';
import { pointInShapeCallback } from '../../../utilities';
const { transformWorldToIndex } = csUtils;
function fillCircle(enabledElement, operationData, threshold = false) {
    const { volume: segmentationVolume, imageVolume, points, segmentsLocked, segmentIndex, segmentationId, strategySpecificConfiguration, } = operationData;
    const { imageData, dimensions } = segmentationVolume;
    const scalarData = segmentationVolume.getScalarData();
    const { viewport } = enabledElement;
    const center = vec3.fromValues(0, 0, 0);
    points.forEach((point) => {
        vec3.add(center, center, point);
    });
    vec3.scale(center, center, 1 / points.length);
    const canvasCoordinates = points.map((p) => viewport.worldToCanvas(p));
    const [topLeftCanvas, bottomRightCanvas] = getCanvasEllipseCorners(canvasCoordinates);
    const topLeftWorld = viewport.canvasToWorld(topLeftCanvas);
    const bottomRightWorld = viewport.canvasToWorld(bottomRightCanvas);
    const ellipsoidCornersIJK = [
        transformWorldToIndex(imageData, topLeftWorld),
        transformWorldToIndex(imageData, bottomRightWorld),
    ];
    const boundsIJK = getBoundingBoxAroundShape(ellipsoidCornersIJK, dimensions);
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
    pointInShapeCallback(imageData, (pointLPS, pointIJK) => pointInEllipse(ellipseObj, pointLPS), callback, boundsIJK);
    const arrayOfSlices = Array.from(modifiedSlicesToUse);
    triggerSegmentationDataModified(segmentationId, arrayOfSlices);
}
function isWithinThreshold(index, imageVolume, strategySpecificConfiguration) {
    const { THRESHOLD_INSIDE_CIRCLE } = strategySpecificConfiguration;
    const voxelValue = imageVolume.getScalarData()[index];
    const { threshold } = THRESHOLD_INSIDE_CIRCLE;
    return threshold[0] <= voxelValue && voxelValue <= threshold[1];
}
export function fillInsideCircle(enabledElement, operationData) {
    fillCircle(enabledElement, operationData, false);
}
export function thresholdInsideCircle(enabledElement, operationData) {
    const { volume, imageVolume } = operationData;
    if (!csUtils.isEqual(volume.dimensions, imageVolume.dimensions) ||
        !csUtils.isEqual(volume.direction, imageVolume.direction)) {
        throw new Error('Only source data the same dimensions/size/orientation as the segmentation currently supported.');
    }
    fillCircle(enabledElement, operationData, true);
}
export function fillOutsideCircle(enabledElement, operationData) {
    throw new Error('Not yet implemented');
}
//# sourceMappingURL=fillCircle.js.map