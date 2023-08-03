import type { Types } from '@cornerstonejs/core';
import type { PublicToolProps, ToolProps, EventTypes, SVGDrawingHelper } from '../../types';
import { BaseTool } from '../base';
declare class BrushTool extends BaseTool {
    static toolName: any;
    private _editData;
    private _hoverData?;
    constructor(toolProps?: PublicToolProps, defaultToolProps?: ToolProps);
    onSetToolPassive: () => void;
    onSetToolEnabled: () => void;
    onSetToolDisabled: () => void;
    private disableCursor;
    preMouseDownCallback: (evt: EventTypes.MouseDownActivateEventType) => boolean;
    mouseMoveCallback: (evt: EventTypes.InteractionEventType) => void;
    private updateCursor;
    private _dragCallback;
    private _calculateCursor;
    private _endCallback;
    private _activateDraw;
    private _deactivateDraw;
    invalidateBrushCursor(): void;
    renderAnnotation(enabledElement: Types.IEnabledElement, svgDrawingHelper: SVGDrawingHelper): void;
}
export default BrushTool;
