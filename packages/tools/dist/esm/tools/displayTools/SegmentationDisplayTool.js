import { getEnabledElementByIds, utilities as csUtils, } from '@cornerstonejs/core';
import Representations from '../../enums/SegmentationRepresentations';
import { config as segmentationConfig } from '../../stateManagement/segmentation';
import { setSegmentationVisibility } from '../../stateManagement/segmentation/config/segmentationVisibility';
import { getSegmentationRepresentations } from '../../stateManagement/segmentation/segmentationState';
import { getToolGroup } from '../../store/ToolGroupManager';
import { BaseTool } from '../base';
import { contourDisplay } from './Contour';
import { labelmapDisplay } from './Labelmap';
class SegmentationDisplayTool extends BaseTool {
    constructor(toolProps = {}, defaultToolProps = {
        configuration: {},
    }) {
        super(toolProps, defaultToolProps);
        this.renderSegmentation = (toolGroupId) => {
            const toolGroup = getToolGroup(toolGroupId);
            if (!toolGroup) {
                return;
            }
            const toolGroupSegmentationRepresentations = getSegmentationRepresentations(toolGroupId);
            if (!toolGroupSegmentationRepresentations ||
                toolGroupSegmentationRepresentations.length === 0) {
                return;
            }
            const toolGroupViewports = toolGroup.viewportsInfo.map(({ renderingEngineId, viewportId }) => {
                const enabledElement = getEnabledElementByIds(viewportId, renderingEngineId);
                if (enabledElement) {
                    return enabledElement.viewport;
                }
            });
            const segmentationRenderList = toolGroupSegmentationRepresentations.map((representation) => {
                const config = this._getMergedRepresentationsConfig(toolGroupId);
                const viewportsRenderList = [];
                for (const viewport of toolGroupViewports) {
                    if (representation.type == Representations.Labelmap) {
                        viewportsRenderList.push(labelmapDisplay.render(viewport, representation, config));
                    }
                    else if (representation.type == Representations.Contour) {
                        viewportsRenderList.push(contourDisplay.render(viewport, representation, config));
                    }
                }
                return viewportsRenderList;
            });
            Promise.allSettled(segmentationRenderList).then(() => {
                toolGroupViewports.forEach((viewport) => {
                    viewport.render();
                });
            });
        };
    }
    onSetToolEnabled() {
        const toolGroupId = this.toolGroupId;
        const toolGroupSegmentationRepresentations = getSegmentationRepresentations(toolGroupId);
        if (!toolGroupSegmentationRepresentations ||
            toolGroupSegmentationRepresentations.length === 0) {
            return;
        }
        toolGroupSegmentationRepresentations.forEach((segmentationRepresentation) => {
            setSegmentationVisibility(toolGroupId, segmentationRepresentation.segmentationRepresentationUID, true);
        });
    }
    onSetToolDisabled() {
        const toolGroupId = this.toolGroupId;
        const toolGroupSegmentationRepresentations = getSegmentationRepresentations(toolGroupId);
        if (!toolGroupSegmentationRepresentations ||
            toolGroupSegmentationRepresentations.length === 0) {
            return;
        }
        toolGroupSegmentationRepresentations.forEach((segmentationRepresentation) => {
            setSegmentationVisibility(toolGroupId, segmentationRepresentation.segmentationRepresentationUID, false);
        });
    }
    _getMergedRepresentationsConfig(toolGroupId) {
        const toolGroupConfig = segmentationConfig.getToolGroupSpecificConfig(toolGroupId);
        const globalConfig = segmentationConfig.getGlobalConfig();
        const mergedConfig = csUtils.deepMerge(globalConfig, toolGroupConfig);
        return mergedConfig;
    }
}
SegmentationDisplayTool.toolName = 'SegmentationDisplay';
export default SegmentationDisplayTool;
//# sourceMappingURL=SegmentationDisplayTool.js.map