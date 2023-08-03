import type { Types } from '@cornerstonejs/core';
declare type OperationData = {
    segmentationId: string;
    imageVolume: Types.IImageVolume;
    points: any;
    volume: Types.IImageVolume;
    segmentIndex: number;
    segmentsLocked: number[];
    viewPlaneNormal: number[];
    viewUp: number[];
    strategySpecificConfiguration: any;
    constraintFn: () => boolean;
};
export declare function fillInsideCircle(enabledElement: Types.IEnabledElement, operationData: OperationData): void;
export declare function thresholdInsideCircle(enabledElement: Types.IEnabledElement, operationData: OperationData): void;
export declare function fillOutsideCircle(enabledElement: Types.IEnabledElement, operationData: OperationData): void;
export {};
