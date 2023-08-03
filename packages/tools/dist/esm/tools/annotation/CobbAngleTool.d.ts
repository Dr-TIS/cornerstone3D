import type { Types } from '@cornerstonejs/core';
import { AnnotationTool } from '../base';
import { EventTypes, ToolHandle, PublicToolProps, ToolProps, InteractionTypes, SVGDrawingHelper } from '../../types';
import { AngleAnnotation } from '../../types/ToolSpecificAnnotationTypes';
declare class CobbAngleTool extends AnnotationTool {
    static toolName: any;
    touchDragCallback: any;
    mouseDragCallback: any;
    angleStartedNotYetCompleted: boolean;
    _throttledCalculateCachedStats: any;
    editData: {
        annotation: any;
        viewportIdsToRender: string[];
        handleIndex?: number;
        movingTextBox?: boolean;
        newAnnotation?: boolean;
        hasMoved?: boolean;
    } | null;
    isDrawing: boolean;
    isHandleOutsideImage: boolean;
    constructor(toolProps?: PublicToolProps, defaultToolProps?: ToolProps);
    addNewAnnotation: (evt: EventTypes.MouseDownActivateEventType) => AngleAnnotation;
    isPointNearTool: (element: HTMLDivElement, annotation: AngleAnnotation, canvasCoords: Types.Point2, proximity: number) => boolean;
    toolSelectedCallback: (evt: EventTypes.MouseDownEventType, annotation: AngleAnnotation, interactionType: InteractionTypes) => void;
    handleSelectedCallback(evt: EventTypes.MouseDownEventType, annotation: AngleAnnotation, handle: ToolHandle, interactionType?: string): void;
    _mouseUpCallback: (evt: EventTypes.MouseUpEventType | EventTypes.MouseClickEventType) => void;
    _mouseDownCallback: (evt: EventTypes.MouseUpEventType | EventTypes.MouseClickEventType) => void;
    _mouseDragCallback: (evt: EventTypes.MouseDragEventType | EventTypes.MouseMoveEventType) => void;
    cancel: (element: HTMLDivElement) => any;
    _activateModify: (element: HTMLDivElement) => void;
    _deactivateModify: (element: HTMLDivElement) => void;
    _activateDraw: (element: HTMLDivElement) => void;
    _deactivateDraw: (element: HTMLDivElement) => void;
    renderAnnotation: (enabledElement: Types.IEnabledElement, svgDrawingHelper: SVGDrawingHelper) => boolean;
    _getTextLines(data: any, targetId: any): string[];
    _calculateCachedStats(annotation: any, renderingEngine: any, enabledElement: any): any;
}
export default CobbAngleTool;
