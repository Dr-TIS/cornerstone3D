import { ToolGroupSpecificRepresentation } from '../../types/SegmentationStateTypes';
declare function getActiveSegmentationRepresentation(toolGroupId: string): ToolGroupSpecificRepresentation;
declare function setActiveSegmentationRepresentation(toolGroupId: string, segmentationRepresentationUID: string): void;
export { getActiveSegmentationRepresentation, setActiveSegmentationRepresentation, };
