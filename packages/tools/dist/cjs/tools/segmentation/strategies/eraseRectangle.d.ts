import { ImageVolume } from '@cornerstonejs/core';
import type { Types } from '@cornerstonejs/core';
declare type EraseOperationData = {
    segmentationId: string;
    points: [Types.Point3, Types.Point3, Types.Point3, Types.Point3];
    volume: ImageVolume;
    constraintFn: (x: [number, number, number]) => boolean;
    segmentsLocked: number[];
};
export declare function eraseInsideRectangle(enabledElement: Types.IEnabledElement, operationData: EraseOperationData): void;
export declare function eraseOutsideRectangle(enabledElement: Types.IEnabledElement, operationData: EraseOperationData): void;
export {};
