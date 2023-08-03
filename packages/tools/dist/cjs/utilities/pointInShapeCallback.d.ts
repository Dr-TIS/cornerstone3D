import type { Types } from '@cornerstonejs/core';
import type { vtkImageData } from '@kitware/vtk.js/Common/DataModel/ImageData';
import BoundsIJK from '../types/BoundsIJK';
export declare type PointInShapeCallback = ({ value, index, pointIJK, pointLPS, }: {
    value: number;
    index: number;
    pointIJK: Types.Point3;
    pointLPS: Types.Point3;
}) => void;
export declare type ShapeFnCriteria = (pointIJK: Types.Point3, pointLPS: Types.Point3) => boolean;
export default function pointInShapeCallback(imageData: vtkImageData | Types.CPUImageData, pointInShapeFn: ShapeFnCriteria, callback: PointInShapeCallback, boundsIJK?: BoundsIJK): void;
