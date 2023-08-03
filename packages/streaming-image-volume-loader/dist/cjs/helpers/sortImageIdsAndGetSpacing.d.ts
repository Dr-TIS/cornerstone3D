import { vec3 } from 'gl-matrix';
import type { Types } from '@cornerstonejs/core';
declare type SortedImageIdsItem = {
    zSpacing: number;
    origin: Types.Point3;
    sortedImageIds: Array<string>;
};
export default function sortImageIdsAndGetSpacing(imageIds: Array<string>, scanAxisNormal: vec3): SortedImageIdsItem;
export {};
