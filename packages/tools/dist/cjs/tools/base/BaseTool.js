"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@cornerstonejs/core");
const enums_1 = require("../../enums");
class BaseTool {
    constructor(toolProps, defaultToolProps) {
        const initialProps = core_1.utilities.deepMerge(defaultToolProps, toolProps);
        const { configuration = {}, supportedInteractionTypes, toolGroupId, } = initialProps;
        if (!configuration.strategies) {
            configuration.strategies = {};
            configuration.defaultStrategy = undefined;
            configuration.activeStrategy = undefined;
            configuration.strategyOptions = {};
        }
        this.toolGroupId = toolGroupId;
        this.supportedInteractionTypes = supportedInteractionTypes || [];
        this.configuration = Object.assign({}, configuration);
        this.mode = enums_1.ToolModes.Disabled;
    }
    getToolName() {
        return this.constructor.toolName;
    }
    applyActiveStrategy(enabledElement, operationData) {
        const { strategies, activeStrategy } = this.configuration;
        return strategies[activeStrategy].call(this, enabledElement, operationData);
    }
    setConfiguration(newConfiguration) {
        this.configuration = core_1.utilities.deepMerge(this.configuration, newConfiguration);
    }
    setActiveStrategy(strategyName) {
        this.setConfiguration({ activeStrategy: strategyName });
    }
    getTargetVolumeId(viewport) {
        var _a;
        if (this.configuration.volumeId) {
            return this.configuration.volumeId;
        }
        const actorEntries = viewport.getActors();
        if (!actorEntries) {
            return;
        }
        return (_a = actorEntries.find((actorEntry) => actorEntry.actor.getClassName() === 'vtkVolume')) === null || _a === void 0 ? void 0 : _a.uid;
    }
    getTargetIdImage(targetId, renderingEngine) {
        if (targetId.startsWith('imageId:')) {
            const imageId = targetId.split('imageId:')[1];
            const imageURI = core_1.utilities.imageIdToURI(imageId);
            let viewports = core_1.utilities.getViewportsWithImageURI(imageURI, renderingEngine.id);
            if (!viewports || !viewports.length) {
                return;
            }
            viewports = viewports.filter((viewport) => {
                return viewport.getCurrentImageId() === imageId;
            });
            if (!viewports || !viewports.length) {
                return;
            }
            return viewports[0].getImageData();
        }
        else if (targetId.startsWith('volumeId:')) {
            const volumeId = targetId.split('volumeId:')[1];
            const viewports = core_1.utilities.getViewportsWithVolumeId(volumeId, renderingEngine.id);
            if (!viewports || !viewports.length) {
                return;
            }
            return viewports[0].getImageData();
        }
        else {
            throw new Error('getTargetIdImage: targetId must start with "imageId:" or "volumeId:"');
        }
    }
    getTargetId(viewport) {
        if (viewport instanceof core_1.StackViewport) {
            return `imageId:${viewport.getCurrentImageId()}`;
        }
        else if (viewport instanceof core_1.BaseVolumeViewport) {
            return `volumeId:${this.getTargetVolumeId(viewport)}`;
        }
        else {
            throw new Error('getTargetId: viewport must be a StackViewport or VolumeViewport');
        }
    }
}
BaseTool.toolName = 'BaseTool';
exports.default = BaseTool;
//# sourceMappingURL=BaseTool.js.map