import { getToolGroup } from '../../store/ToolGroupManager';
import triggerAnnotationRenderForViewportIds from '../triggerAnnotationRenderForViewportIds';
import { getRenderingEngine } from '@cornerstonejs/core';
import getBrushToolInstances from './utilities';
export function setBrushThresholdForToolGroup(toolGroupId, threshold) {
    const toolGroup = getToolGroup(toolGroupId);
    if (toolGroup === undefined) {
        return;
    }
    const brushBasedToolInstances = getBrushToolInstances(toolGroupId);
    brushBasedToolInstances.forEach((tool) => {
        tool.configuration.strategySpecificConfiguration.THRESHOLD_INSIDE_CIRCLE.threshold =
            threshold;
    });
    const viewportsInfo = toolGroup.getViewportsInfo();
    if (!viewportsInfo.length) {
        return;
    }
    const { renderingEngineId } = viewportsInfo[0];
    const viewportIds = toolGroup.getViewportIds();
    const renderingEngine = getRenderingEngine(renderingEngineId);
    triggerAnnotationRenderForViewportIds(renderingEngine, viewportIds);
}
export function getBrushThresholdForToolGroup(toolGroupId) {
    const toolGroup = getToolGroup(toolGroupId);
    if (toolGroup === undefined) {
        return;
    }
    const toolInstances = toolGroup._toolInstances;
    if (!Object.keys(toolInstances).length) {
        return;
    }
    const brushBasedToolInstances = getBrushToolInstances(toolGroupId);
    const brushToolInstance = brushBasedToolInstances[0];
    if (!brushToolInstance) {
        return;
    }
    return brushToolInstance.configuration.strategySpecificConfiguration
        .THRESHOLD_INSIDE_CIRCLE.threshold;
}
//# sourceMappingURL=brushThresholdForToolGroup.js.map