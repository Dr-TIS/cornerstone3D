import { Types } from '@cornerstonejs/core';
import BrushTool from '../../tools/segmentation/BrushTool';
export declare type ThresholdInformation = {
    volume: Types.IImageVolume;
    lower: number;
    upper: number;
};
export default function getBrushToolInstances(toolGroupId: any): BrushTool[];
export declare function getVoxelOverlap(imageData: any, dimensions: any, voxelSpacing: any, voxelCenter: any): [Types.Point2, Types.Point2, Types.Point2];
export declare function processVolumes(segmentationVolume: Types.IImageVolume, thresholdVolumeInformation: ThresholdInformation[]): {
    volumeInfoList: any[];
    baseVolumeIdx: number;
};
