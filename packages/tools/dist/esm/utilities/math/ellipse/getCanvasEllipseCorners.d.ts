import type { Types } from '@cornerstonejs/core';
declare type canvasCoordinates = [
    Types.Point2,
    Types.Point2,
    Types.Point2,
    Types.Point2
];
export default function getCanvasEllipseCorners(ellipseCanvasPoints: canvasCoordinates): Array<Types.Point2>;
export {};
