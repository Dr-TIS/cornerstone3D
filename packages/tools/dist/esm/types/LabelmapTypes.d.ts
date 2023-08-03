import type { vtkColorTransferFunction } from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import type { vtkPiecewiseFunction } from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';
export declare type LabelmapConfig = {
    renderOutline?: boolean;
    outlineWidthActive?: number;
    outlineWidthInactive?: number;
    renderFill?: boolean;
    renderFillInactive?: boolean;
    fillAlpha?: number;
    fillAlphaInactive?: number;
    outlineOpacity?: number;
    outlineOpacityInactive?: number;
};
export declare type LabelmapRenderingConfig = {
    cfun?: vtkColorTransferFunction;
    ofun?: vtkPiecewiseFunction;
};
export declare type LabelmapSegmentationData = {
    volumeId: string;
    referencedVolumeId?: string;
};
