import { Types } from '@cornerstonejs/core';
import { RepresentationPublicInput, SegmentationRepresentationConfig, ToolGroupSpecificRepresentation } from '../../../types/SegmentationStateTypes';
declare function addSegmentationRepresentation(toolGroupId: string, representationInput: RepresentationPublicInput, toolGroupSpecificConfig?: SegmentationRepresentationConfig): Promise<string>;
declare function removeSegmentationRepresentation(toolGroupId: string, segmentationRepresentationUID: string, renderImmediate?: boolean): void;
declare function render(viewport: Types.IVolumeViewport, representation: ToolGroupSpecificRepresentation, toolGroupConfig: SegmentationRepresentationConfig): Promise<void>;
declare const _default: {
    render: typeof render;
    addSegmentationRepresentation: typeof addSegmentationRepresentation;
    removeSegmentationRepresentation: typeof removeSegmentationRepresentation;
};
export default _default;
