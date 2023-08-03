import { ImageVolume } from '@cornerstonejs/core';
import type { Types } from '@cornerstonejs/core';
declare type OperationData = {
    segmentationId: string;
    points: [Types.Point3, Types.Point3, Types.Point3, Types.Point3];
    volume: ImageVolume;
    constraintFn: (x: [number, number, number]) => boolean;
    segmentIndex: number;
    segmentsLocked: number[];
};
export declare function fillInsideRectangle(enabledElement: Types.IEnabledElement, operationData: OperationData): void;
export declare function fillOutsideRectangle(enabledElement: Types.IEnabledElement, operationData: OperationData): void;
export {};
