import { MouseBindings, ToolModes } from '../../enums';
import cloneDeep from 'lodash.clonedeep';
import get from 'lodash.get';
import { triggerEvent, eventTarget, getRenderingEngine, getRenderingEngines, getEnabledElementByIds, Settings, utilities as csUtils, } from '@cornerstonejs/core';
import { Events } from '../../enums';
import { state } from '../index';
import { MouseCursor, SVGMouseCursor } from '../../cursors';
import { initElementCursor } from '../../cursors/elementCursor';
const { Active, Passive, Enabled, Disabled } = ToolModes;
export default class ToolGroup {
    constructor(id) {
        this.viewportsInfo = [];
        this.toolOptions = {};
        this._toolInstances = {};
        this.id = id;
    }
    getViewportIds() {
        return this.viewportsInfo.map(({ viewportId }) => viewportId);
    }
    getViewportsInfo() {
        return this.viewportsInfo.slice();
    }
    getToolInstance(toolInstanceName) {
        const toolInstance = this._toolInstances[toolInstanceName];
        if (!toolInstance) {
            console.warn(`'${toolInstanceName}' is not registered with this toolGroup (${this.id}).`);
            return;
        }
        return toolInstance;
    }
    addTool(toolName, configuration = {}) {
        const toolDefinition = state.tools[toolName];
        const hasToolName = typeof toolName !== 'undefined' && toolName !== '';
        const localToolInstance = this.toolOptions[toolName];
        if (!hasToolName) {
            console.warn('Tool with configuration did not produce a toolName: ', configuration);
            return;
        }
        if (!toolDefinition) {
            console.warn(`'${toolName}' is not registered with the library. You need to use cornerstoneTools.addTool to register it.`);
            return;
        }
        if (localToolInstance) {
            console.warn(`'${toolName}' is already registered for ToolGroup ${this.id}.`);
            return;
        }
        const { toolClass: ToolClass } = toolDefinition;
        const toolProps = {
            name: toolName,
            toolGroupId: this.id,
            configuration,
        };
        const instantiatedTool = new ToolClass(toolProps);
        this._toolInstances[toolName] = instantiatedTool;
    }
    addToolInstance(toolName, parentClassName, configuration = {}) {
        let ToolClassToUse = state.tools[toolName]
            ?.toolClass;
        if (!ToolClassToUse) {
            const ParentClass = state.tools[parentClassName]
                .toolClass;
            class ToolInstance extends ParentClass {
            }
            ToolInstance.toolName = toolName;
            ToolClassToUse = ToolInstance;
            state.tools[toolName] = {
                toolClass: ToolInstance,
            };
        }
        this.addTool(ToolClassToUse.toolName, configuration);
    }
    addViewport(viewportId, renderingEngineId) {
        const renderingEngines = getRenderingEngines();
        if (!renderingEngineId && renderingEngines.length > 1) {
            throw new Error('You must specify a renderingEngineId when there are multiple rendering engines.');
        }
        const renderingEngineUIDToUse = renderingEngineId || renderingEngines[0].id;
        if (!this.viewportsInfo.some(({ viewportId: vpId }) => vpId === viewportId)) {
            this.viewportsInfo.push({
                viewportId,
                renderingEngineId: renderingEngineUIDToUse,
            });
        }
        const toolName = this.getActivePrimaryMouseButtonTool();
        const runtimeSettings = Settings.getRuntimeSettings();
        if (runtimeSettings.get('useCursors')) {
            this.setViewportsCursorByToolName(toolName);
        }
    }
    removeViewports(renderingEngineId, viewportId) {
        const indices = [];
        this.viewportsInfo.forEach((vpInfo, index) => {
            let match = false;
            if (vpInfo.renderingEngineId === renderingEngineId) {
                match = true;
                if (viewportId && vpInfo.viewportId !== viewportId) {
                    match = false;
                }
            }
            if (match) {
                indices.push(index);
            }
        });
        if (indices.length) {
            for (let i = indices.length - 1; i >= 0; i--) {
                this.viewportsInfo.splice(indices[i], 1);
            }
        }
    }
    setActiveStrategy(toolName, strategyName) {
        const toolInstance = this._toolInstances[toolName];
        if (toolInstance === undefined) {
            console.warn(`Tool ${toolName} not added to toolGroup, can't set tool configuration.`);
            return;
        }
        toolInstance.setActiveStrategy(strategyName);
    }
    setToolMode(toolName, mode, options = {}) {
        if (!toolName) {
            console.warn('setToolMode: toolName must be defined');
            return;
        }
        if (mode === ToolModes.Active) {
            this.setToolActive(toolName, options);
            return;
        }
        if (mode === ToolModes.Passive) {
            this.setToolPassive(toolName);
            return;
        }
        if (mode === ToolModes.Enabled) {
            this.setToolEnabled(toolName);
            return;
        }
        if (mode === ToolModes.Disabled) {
            this.setToolDisabled(toolName);
            return;
        }
        console.warn('setToolMode: mode must be defined');
    }
    setToolActive(toolName, toolBindingsOptions = {}) {
        const toolInstance = this._toolInstances[toolName];
        if (toolInstance === undefined) {
            console.warn(`Tool ${toolName} not added to toolGroup, can't set tool mode.`);
            return;
        }
        if (!toolInstance) {
            console.warn(`'${toolName}' instance ${toolInstance} is not registered with this toolGroup, can't set tool mode.`);
            return;
        }
        const prevBindings = this.toolOptions[toolName]
            ? this.toolOptions[toolName].bindings
            : [];
        const newBindings = toolBindingsOptions.bindings
            ? toolBindingsOptions.bindings
            : [];
        const bindingsToUse = [...prevBindings, ...newBindings].reduce((unique, binding) => {
            const TouchBinding = binding.numTouchPoints !== undefined;
            const MouseBinding = binding.mouseButton !== undefined;
            if (!unique.some((obj) => hasSameBinding(obj, binding)) &&
                (TouchBinding || MouseBinding)) {
                unique.push(binding);
            }
            return unique;
        }, []);
        const toolOptions = {
            bindings: bindingsToUse,
            mode: Active,
        };
        this.toolOptions[toolName] = toolOptions;
        this._toolInstances[toolName].mode = Active;
        const runtimeSettings = Settings.getRuntimeSettings();
        const useCursor = runtimeSettings.get('useCursors');
        if (this._hasMousePrimaryButtonBinding(toolBindingsOptions) && useCursor) {
            this.setViewportsCursorByToolName(toolName);
        }
        else {
            const activeToolIdentifier = this.getActivePrimaryMouseButtonTool();
            if (!activeToolIdentifier && useCursor) {
                const cursor = MouseCursor.getDefinedCursor('default');
                this._setCursorForViewports(cursor);
            }
        }
        if (typeof toolInstance.onSetToolActive === 'function') {
            toolInstance.onSetToolActive();
        }
        this._renderViewports();
        const eventDetail = {
            toolGroupId: this.id,
            toolName,
            toolBindingsOptions,
        };
        triggerEvent(eventTarget, Events.TOOL_ACTIVATED, eventDetail);
    }
    setToolPassive(toolName) {
        const toolInstance = this._toolInstances[toolName];
        if (toolInstance === undefined) {
            console.warn(`Tool ${toolName} not added to toolGroup, can't set tool mode.`);
            return;
        }
        const prevToolOptions = this.getToolOptions(toolName);
        const toolOptions = Object.assign({
            bindings: prevToolOptions ? prevToolOptions.bindings : [],
        }, prevToolOptions, {
            mode: Passive,
        });
        const defaultMousePrimary = this.getDefaultMousePrimary();
        toolOptions.bindings = toolOptions.bindings.filter((binding) => binding.mouseButton !== defaultMousePrimary || binding.modifierKey);
        let mode = Passive;
        if (toolOptions.bindings.length !== 0) {
            mode = Active;
            toolOptions.mode = mode;
        }
        this.toolOptions[toolName] = toolOptions;
        toolInstance.mode = mode;
        if (typeof toolInstance.onSetToolPassive === 'function') {
            toolInstance.onSetToolPassive();
        }
        this._renderViewports();
    }
    setToolEnabled(toolName) {
        const toolInstance = this._toolInstances[toolName];
        if (toolInstance === undefined) {
            console.warn(`Tool ${toolName} not added to toolGroup, can't set tool mode.`);
            return;
        }
        const toolOptions = {
            bindings: [],
            mode: Enabled,
        };
        this.toolOptions[toolName] = toolOptions;
        toolInstance.mode = Enabled;
        if (typeof toolInstance.onSetToolEnabled === 'function') {
            toolInstance.onSetToolEnabled();
        }
        this._renderViewports();
    }
    setToolDisabled(toolName) {
        const toolInstance = this._toolInstances[toolName];
        if (toolInstance === undefined) {
            console.warn(`Tool ${toolName} not added to toolGroup, can't set tool mode.`);
            return;
        }
        const toolOptions = {
            bindings: [],
            mode: Disabled,
        };
        this.toolOptions[toolName] = toolOptions;
        toolInstance.mode = Disabled;
        if (typeof toolInstance.onSetToolDisabled === 'function') {
            toolInstance.onSetToolDisabled();
        }
        this._renderViewports();
    }
    getToolOptions(toolName) {
        const toolOptionsForTool = this.toolOptions[toolName];
        if (toolOptionsForTool === undefined) {
            return;
        }
        return toolOptionsForTool;
    }
    getActivePrimaryMouseButtonTool() {
        return Object.keys(this.toolOptions).find((toolName) => {
            const toolOptions = this.toolOptions[toolName];
            return (toolOptions.mode === Active &&
                this._hasMousePrimaryButtonBinding(toolOptions));
        });
    }
    setViewportsCursorByToolName(toolName, strategyName) {
        const cursor = this._getCursor(toolName, strategyName);
        this._setCursorForViewports(cursor);
    }
    _getCursor(toolName, strategyName) {
        let cursorName;
        let cursor;
        if (strategyName) {
            cursorName = `${toolName}.${strategyName}`;
            cursor = SVGMouseCursor.getDefinedCursor(cursorName, true);
            if (cursor) {
                return cursor;
            }
        }
        cursorName = `${toolName}`;
        cursor = SVGMouseCursor.getDefinedCursor(cursorName, true);
        if (cursor) {
            return cursor;
        }
        cursorName = toolName;
        cursor = SVGMouseCursor.getDefinedCursor(cursorName, true);
        if (cursor) {
            return cursor;
        }
        return MouseCursor.getDefinedCursor('default');
    }
    _setCursorForViewports(cursor) {
        this.viewportsInfo.forEach(({ renderingEngineId, viewportId }) => {
            const enabledElement = getEnabledElementByIds(viewportId, renderingEngineId);
            if (!enabledElement) {
                return;
            }
            const { viewport } = enabledElement;
            initElementCursor(viewport.element, cursor);
        });
    }
    setToolConfiguration(toolName, configuration, overwrite) {
        if (this._toolInstances[toolName] === undefined) {
            console.warn(`Tool ${toolName} not present, can't set tool configuration.`);
            return false;
        }
        let _configuration;
        if (overwrite) {
            _configuration = configuration;
        }
        else {
            _configuration = csUtils.deepMerge(this._toolInstances[toolName].configuration, configuration);
        }
        this._toolInstances[toolName].configuration = _configuration;
        this._renderViewports();
        return true;
    }
    getDefaultMousePrimary() {
        return MouseBindings.Primary;
    }
    getToolConfiguration(toolName, configurationPath) {
        if (this._toolInstances[toolName] === undefined) {
            console.warn(`Tool ${toolName} not present, can't set tool configuration.`);
            return;
        }
        const _configuration = get(this._toolInstances[toolName].configuration, configurationPath);
        return cloneDeep(_configuration);
    }
    _hasMousePrimaryButtonBinding(toolOptions) {
        const defaultMousePrimary = this.getDefaultMousePrimary();
        return toolOptions?.bindings?.some((binding) => binding.mouseButton === defaultMousePrimary &&
            binding.modifierKey === undefined);
    }
    _renderViewports() {
        this.viewportsInfo.forEach(({ renderingEngineId, viewportId }) => {
            getRenderingEngine(renderingEngineId).renderViewport(viewportId);
        });
    }
}
function hasSameBinding(binding1, binding2) {
    if (binding1.mouseButton !== binding2.mouseButton) {
        return false;
    }
    return binding1.modifierKey === binding2.modifierKey;
}
//# sourceMappingURL=ToolGroup.js.map