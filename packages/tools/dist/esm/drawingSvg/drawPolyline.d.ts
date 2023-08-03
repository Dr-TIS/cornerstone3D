import type { Types } from '@cornerstonejs/core';
import { SVGDrawingHelper } from '../types';
export default function drawPolyline(svgDrawingHelper: SVGDrawingHelper, annotationUID: string, polylineUID: string, points: Types.Point2[], options: {
    color?: string;
    width?: number;
    lineWidth?: number;
    lineDash?: string;
    connectLastToFirst?: boolean;
}): void;
