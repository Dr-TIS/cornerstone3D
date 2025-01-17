import { StackViewport, utilities, BaseVolumeViewport, } from '@cornerstonejs/core';
import { ToolModes } from '../../enums';
class BaseTool {
    constructor(toolProps, defaultToolProps) {
        const initialProps = utilities.deepMerge(defaultToolProps, toolProps);
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
        this.mode = ToolModes.Disabled;
    }
    getToolName() {
        return this.constructor.toolName;
    }
    applyActiveStrategy(enabledElement, operationData) {
        const { strategies, activeStrategy } = this.configuration;
        return strategies[activeStrategy].call(this, enabledElement, operationData);
    }
    setConfiguration(newConfiguration) {
        this.configuration = utilities.deepMerge(this.configuration, newConfiguration);
    }
    setActiveStrategy(strategyName) {
        this.setConfiguration({ activeStrategy: strategyName });
    }
    getTargetVolumeId(viewport) {
        if (this.configuration.volumeId) {
            return this.configuration.volumeId;
        }
        const actorEntries = viewport.getActors();
        if (!actorEntries) {
            return;
        }
        return actorEntries.find((actorEntry) => actorEntry.actor.getClassName() === 'vtkVolume')?.uid;
    }
    getTargetIdImage(targetId, renderingEngine) {
        if (targetId.startsWith('imageId:')) {
            const imageId = targetId.split('imageId:')[1];
            const imageURI = utilities.imageIdToURI(imageId);
            let viewports = utilities.getViewportsWithImageURI(imageURI, renderingEngine.id);
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
            const viewports = utilities.getViewportsWithVolumeId(volumeId, renderingEngine.id);
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
        if (viewport instanceof StackViewport) {
            return `imageId:${viewport.getCurrentImageId()}`;
        }
        else if (viewport instanceof BaseVolumeViewport) {
            return `volumeId:${this.getTargetVolumeId(viewport)}`;
        }
        else {
            throw new Error('getTargetId: viewport must be a StackViewport or VolumeViewport');
        }
    }
}
BaseTool.toolName = 'BaseTool';
export default BaseTool;
//# sourceMappingURL=BaseTool.js.map