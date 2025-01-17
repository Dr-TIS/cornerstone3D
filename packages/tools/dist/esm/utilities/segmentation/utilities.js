import { utilities as csUtils } from '@cornerstonejs/core';
import { getToolGroup } from '../../store/ToolGroupManager';
import BrushTool from '../../tools/segmentation/BrushTool';
import getBoundingBoxAroundShape from '../boundingBox/getBoundingBoxAroundShape';
export default function getBrushToolInstances(toolGroupId) {
    const toolGroup = getToolGroup(toolGroupId);
    if (toolGroup === undefined) {
        return;
    }
    const toolInstances = toolGroup._toolInstances;
    if (!Object.keys(toolInstances).length) {
        return;
    }
    const brushBasedToolInstances = Object.values(toolInstances).filter((toolInstance) => toolInstance instanceof BrushTool);
    return brushBasedToolInstances;
}
const equalsCheck = (a, b) => {
    return JSON.stringify(a) === JSON.stringify(b);
};
export function getVoxelOverlap(imageData, dimensions, voxelSpacing, voxelCenter) {
    const voxelCornersWorld = [];
    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
            for (let k = 0; k < 2; k++) {
                const point = voxelCenter;
                point[0] = point[0] + ((i * 2 - 1) * voxelSpacing[0]) / 2;
                point[1] = point[1] + ((j * 2 - 1) * voxelSpacing[1]) / 2;
                point[2] = point[2] + ((k * 2 - 1) * voxelSpacing[2]) / 2;
                voxelCornersWorld.push(point);
            }
        }
    }
    const voxelCornersIJK = voxelCornersWorld.map((world) => csUtils.transformWorldToIndex(imageData, world));
    const overlapBounds = getBoundingBoxAroundShape(voxelCornersIJK, dimensions);
    return overlapBounds;
}
export function processVolumes(segmentationVolume, thresholdVolumeInformation) {
    const { spacing: segmentationSpacing, imageData: segmentationImageData } = segmentationVolume;
    const scalarData = segmentationVolume.getScalarData();
    const volumeInfoList = [];
    let baseVolumeIdx = 0;
    for (let i = 0; i < thresholdVolumeInformation.length; i++) {
        const { imageData, spacing, dimensions } = thresholdVolumeInformation[i].volume;
        const volumeSize = thresholdVolumeInformation[i].volume.getScalarData().length;
        if (volumeSize === scalarData.length &&
            equalsCheck(spacing, segmentationSpacing)) {
            baseVolumeIdx = i;
        }
        const referenceValues = imageData.getPointData().getScalars().getData();
        const lower = thresholdVolumeInformation[i].lower;
        const upper = thresholdVolumeInformation[i].upper;
        volumeInfoList.push({
            imageData,
            referenceValues,
            lower,
            upper,
            spacing,
            dimensions,
            volumeSize,
        });
    }
    return {
        volumeInfoList,
        baseVolumeIdx,
    };
}
//# sourceMappingURL=utilities.js.map