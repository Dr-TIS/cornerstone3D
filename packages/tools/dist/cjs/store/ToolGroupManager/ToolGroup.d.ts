import { MouseBindings, ToolModes } from '../../enums';
import type { Types } from '@cornerstonejs/core';
import { IToolGroup, SetToolBindingsType, ToolOptionsType } from '../../types';
import { MouseCursor } from '../../cursors';
export default class ToolGroup implements IToolGroup {
    id: string;
    viewportsInfo: any[];
    toolOptions: {};
    _toolInstances: {};
    constructor(id: string);
    getViewportIds(): string[];
    getViewportsInfo(): Array<Types.IViewportId>;
    getToolInstance(toolInstanceName: string): any;
    addTool(toolName: string, configuration?: {}): void;
    addToolInstance(toolName: string, parentClassName: string, configuration?: {}): void;
    addViewport(viewportId: string, renderingEngineId?: string): void;
    removeViewports(renderingEngineId: string, viewportId?: string): void;
    setActiveStrategy(toolName: string, strategyName: string): void;
    setToolMode(toolName: string, mode: ToolModes, options?: SetToolBindingsType): void;
    setToolActive(toolName: string, toolBindingsOptions?: SetToolBindingsType): void;
    setToolPassive(toolName: string): void;
    setToolEnabled(toolName: string): void;
    setToolDisabled(toolName: string): void;
    getToolOptions(toolName: string): ToolOptionsType;
    getActivePrimaryMouseButtonTool(): string;
    setViewportsCursorByToolName(toolName: string, strategyName?: string): void;
    private _getCursor;
    _setCursorForViewports(cursor: MouseCursor): void;
    setToolConfiguration(toolName: string, configuration: Record<any, any>, overwrite?: boolean): boolean;
    getDefaultMousePrimary(): MouseBindings;
    getToolConfiguration(toolName: string, configurationPath: string): any;
    private _hasMousePrimaryButtonBinding;
    private _renderViewports;
}
