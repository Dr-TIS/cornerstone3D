import type { Types } from '@cornerstonejs/core';
declare type Ellipse = {
    center: Types.Point3;
    xRadius: number;
    yRadius: number;
    zRadius: number;
};
export default function pointInEllipse(ellipse: Ellipse, pointLPS: Types.Point3): boolean;
export {};
