import { Color } from '../../../types/SegmentationStateTypes';
import { ColorLUT } from '../../../types/SegmentationStateTypes';
declare function addColorLUT(colorLUT: ColorLUT, colorLUTIndex: number): void;
declare function setColorLUT(toolGroupId: string, segmentationRepresentationUID: string, colorLUTIndex: number): void;
declare function getColorForSegmentIndex(toolGroupId: string, segmentationRepresentationUID: string, segmentIndex: number): Color;
declare function setColorForSegmentIndex(toolGroupId: string, segmentationRepresentationUID: string, segmentIndex: number, color: Color): void;
export { getColorForSegmentIndex, addColorLUT, setColorLUT, setColorForSegmentIndex, };
