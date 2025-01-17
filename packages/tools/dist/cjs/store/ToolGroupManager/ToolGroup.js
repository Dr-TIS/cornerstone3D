"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const enums_1 = require("../../enums");
const lodash_clonedeep_1 = __importDefault(require("lodash.clonedeep"));
const lodash_get_1 = __importDefault(require("lodash.get"));
const core_1 = require("@cornerstonejs/core");
const enums_2 = require("../../enums");
const index_1 = require("../index");
const cursors_1 = require("../../cursors");
const elementCursor_1 = require("../../cursors/elementCursor");
const { Active, Passive, Enabled, Disabled } = enums_1.ToolModes;
class ToolGroup {
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
        const toolDefinition = index_1.state.tools[toolName];
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
        var _a;
        let ToolClassToUse = (_a = index_1.state.tools[toolName]) === null || _a === void 0 ? void 0 : _a.toolClass;
        if (!ToolClassToUse) {
            const ParentClass = index_1.state.tools[parentClassName]
                .toolClass;
            class ToolInstance extends ParentClass {
            }
            ToolInstance.toolName = toolName;
            ToolClassToUse = ToolInstance;
            index_1.state.tools[toolName] = {
                toolClass: ToolInstance,
            };
        }
        this.addTool(ToolClassToUse.toolName, configuration);
    }
    addViewport(viewportId, renderingEngineId) {
        const renderingEngines = (0, core_1.getRenderingEngines)();
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
        const runtimeSettings = core_1.Settings.getRuntimeSettings();
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
        if (mode === enums_1.ToolModes.Active) {
            this.setToolActive(toolName, options);
            return;
        }
        if (mode === enums_1.ToolModes.Passive) {
            this.setToolPassive(toolName);
            return;
        }
        if (mode === enums_1.ToolModes.Enabled) {
            this.setToolEnabled(toolName);
            return;
        }
        if (mode === enums_1.ToolModes.Disabled) {
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
        const runtimeSettings = core_1.Settings.getRuntimeSettings();
        const useCursor = runtimeSettings.get('useCursors');
        if (this._hasMousePrimaryButtonBinding(toolBindingsOptions) && useCursor) {
            this.setViewportsCursorByToolName(toolName);
        }
        else {
            const activeToolIdentifier = this.getActivePrimaryMouseButtonTool();
            if (!activeToolIdentifier && useCursor) {
                const cursor = cursors_1.MouseCursor.getDefinedCursor('default');
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
        (0, core_1.triggerEvent)(core_1.eventTarget, enums_2.Events.TOOL_ACTIVATED, eventDetail);
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
            cursor = cursors_1.SVGMouseCursor.getDefinedCursor(cursorName, true);
            if (cursor) {
                return cursor;
            }
        }
        cursorName = `${toolName}`;
        cursor = cursors_1.SVGMouseCursor.getDefinedCursor(cursorName, true);
        if (cursor) {
            return cursor;
        }
        cursorName = toolName;
        cursor = cursors_1.SVGMouseCursor.getDefinedCursor(cursorName, true);
        if (cursor) {
            return cursor;
        }
        return cursors_1.MouseCursor.getDefinedCursor('default');
    }
    _setCursorForViewports(cursor) {
        this.viewportsInfo.forEach(({ renderingEngineId, viewportId }) => {
            const enabledElement = (0, core_1.getEnabledElementByIds)(viewportId, renderingEngineId);
            if (!enabledElement) {
                return;
            }
            const { viewport } = enabledElement;
            (0, elementCursor_1.initElementCursor)(viewport.element, cursor);
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
            _configuration = core_1.utilities.deepMerge(this._toolInstances[toolName].configuration, configuration);
        }
        this._toolInstances[toolName].configuration = _configuration;
        this._renderViewports();
        return true;
    }
    getDefaultMousePrimary() {
        return enums_1.MouseBindings.Primary;
    }
    getToolConfiguration(toolName, configurationPath) {
        if (this._toolInstances[toolName] === undefined) {
            console.warn(`Tool ${toolName} not present, can't set tool configuration.`);
            return;
        }
        const _configuration = (0, lodash_get_1.default)(this._toolInstances[toolName].configuration, configurationPath);
        return (0, lodash_clonedeep_1.default)(_configuration);
    }
    _hasMousePrimaryButtonBinding(toolOptions) {
        var _a;
        const defaultMousePrimary = this.getDefaultMousePrimary();
        return (_a = toolOptions === null || toolOptions === void 0 ? void 0 : toolOptions.bindings) === null || _a === void 0 ? void 0 : _a.some((binding) => binding.mouseButton === defaultMousePrimary &&
            binding.modifierKey === undefined);
    }
    _renderViewports() {
        this.viewportsInfo.forEach(({ renderingEngineId, viewportId }) => {
            (0, core_1.getRenderingEngine)(renderingEngineId).renderViewport(viewportId);
        });
    }
}
exports.default = ToolGroup;
function hasSameBinding(binding1, binding2) {
    if (binding1.mouseButton !== binding2.mouseButton) {
        return false;
    }
    return binding1.modifierKey === binding2.modifierKey;
}
//# sourceMappingURL=ToolGroup.js.map