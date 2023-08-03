import * as Enums from '../enums';
import { ContourConfig, ContourRenderingConfig, ContourSegmentationData } from './ContourTypes';
import type { LabelmapConfig, LabelmapRenderingConfig, LabelmapSegmentationData } from './LabelmapTypes';
export declare type Color = [number, number, number, number];
export declare type ColorLUT = Array<Color>;
export declare type SegmentSpecificRepresentationConfig = {
    [key: number | string]: RepresentationConfig;
};
export declare type RepresentationConfig = {
    LABELMAP?: LabelmapConfig;
    CONTOUR?: ContourConfig;
};
export declare type SegmentationRepresentationConfig = {
    renderInactiveSegmentations: boolean;
    representations: RepresentationConfig;
};
export declare type SegmentationRepresentationData = {
    LABELMAP?: LabelmapSegmentationData;
    CONTOUR?: ContourSegmentationData;
};
export declare type Segmentation = {
    segmentationId: string;
    type: Enums.SegmentationRepresentations;
    label: string;
    activeSegmentIndex: number;
    segmentsLocked: Set<number>;
    cachedStats: {
        [key: string]: number;
    };
    segmentLabels: {
        [key: string]: string;
    };
    representationData: SegmentationRepresentationData;
};
export declare type ToolGroupSpecificRepresentationState = {
    segmentationRepresentationUID: string;
    segmentationId: string;
    type: Enums.SegmentationRepresentations;
    active: boolean;
    segmentsHidden: Set<number>;
    colorLUTIndex: number;
};
export declare type ToolGroupSpecificLabelmapRepresentation = ToolGroupSpecificRepresentationState & {
    config: LabelmapRenderingConfig;
    segmentationRepresentationSpecificConfig?: RepresentationConfig;
    segmentSpecificConfig?: SegmentSpecificRepresentationConfig;
};
export declare type ToolGroupSpecificContourRepresentation = ToolGroupSpecificRepresentationState & {
    config: ContourRenderingConfig;
    segmentationRepresentationSpecificConfig?: RepresentationConfig;
    segmentSpecificConfig?: SegmentSpecificRepresentationConfig;
};
export declare type ToolGroupSpecificRepresentation = ToolGroupSpecificLabelmapRepresentation | ToolGroupSpecificContourRepresentation;
export declare type ToolGroupSpecificRepresentations = Array<ToolGroupSpecificRepresentation>;
export declare type SegmentationState = {
    colorLUT: ColorLUT[];
    segmentations: Segmentation[];
    globalConfig: SegmentationRepresentationConfig;
    toolGroups: {
        [key: string]: {
            segmentationRepresentations: ToolGroupSpecificRepresentations;
            config: SegmentationRepresentationConfig;
        };
    };
};
export declare type SegmentationPublicInput = {
    segmentationId: string;
    representation: {
        type: Enums.SegmentationRepresentations;
        data: LabelmapSegmentationData | ContourSegmentationData;
    };
};
export declare type RepresentationPublicInput = {
    segmentationId: string;
    type: Enums.SegmentationRepresentations;
};
