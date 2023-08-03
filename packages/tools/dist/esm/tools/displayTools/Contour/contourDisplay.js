import { getEnabledElementByIds, utilities as csUtils, } from '@cornerstonejs/core';
import Representations from '../../../enums/SegmentationRepresentations';
import * as SegmentationConfig from '../../../stateManagement/segmentation/config/segmentationConfig';
import * as SegmentationState from '../../../stateManagement/segmentation/segmentationState';
import { getToolGroup } from '../../../store/ToolGroupManager';
import { addOrUpdateContourSets } from './addOrUpdateContourSets';
import removeContourFromElement from './removeContourFromElement';
import { deleteConfigCache } from './contourConfigCache';
async function addSegmentationRepresentation(toolGroupId, representationInput, toolGroupSpecificConfig) {
    const { segmentationId } = representationInput;
    const segmentationRepresentationUID = csUtils.uuidv4();
    const segmentsHidden = new Set();
    const visibility = true;
    const colorLUTIndex = 0;
    const active = true;
    const toolGroupSpecificRepresentation = {
        segmentationId,
        segmentationRepresentationUID,
        type: Representations.Contour,
        segmentsHidden,
        colorLUTIndex,
        active,
        segmentationRepresentationSpecificConfig: {},
        segmentSpecificConfig: {},
        config: {},
    };
    if (toolGroupSpecificConfig) {
        const currentToolGroupConfig = SegmentationConfig.getToolGroupSpecificConfig(toolGroupId);
        const mergedConfig = csUtils.deepMerge(currentToolGroupConfig, toolGroupSpecificConfig);
        SegmentationConfig.setToolGroupSpecificConfig(toolGroupId, {
            renderInactiveSegmentations: mergedConfig.renderInactiveSegmentations || true,
            representations: {
                ...mergedConfig.representations,
            },
        });
    }
    SegmentationState.addSegmentationRepresentation(toolGroupId, toolGroupSpecificRepresentation);
    return segmentationRepresentationUID;
}
function removeSegmentationRepresentation(toolGroupId, segmentationRepresentationUID, renderImmediate = false) {
    _removeContourFromToolGroupViewports(toolGroupId, segmentationRepresentationUID);
    SegmentationState.removeSegmentationRepresentation(toolGroupId, segmentationRepresentationUID);
    deleteConfigCache(segmentationRepresentationUID);
    if (renderImmediate) {
        const viewportsInfo = getToolGroup(toolGroupId).getViewportsInfo();
        viewportsInfo.forEach(({ viewportId, renderingEngineId }) => {
            const enabledElement = getEnabledElementByIds(viewportId, renderingEngineId);
            enabledElement.viewport.render();
        });
    }
}
async function render(viewport, representationConfig, toolGroupConfig) {
    const { segmentationId } = representationConfig;
    const segmentation = SegmentationState.getSegmentation(segmentationId);
    const contourData = segmentation.representationData[Representations.Contour];
    const { geometryIds } = contourData;
    if (!geometryIds?.length) {
        console.warn(`No contours found for segmentationId ${segmentationId}. Skipping render.`);
    }
    addOrUpdateContourSets(viewport, geometryIds, representationConfig, toolGroupConfig);
}
function _removeContourFromToolGroupViewports(toolGroupId, segmentationRepresentationUID) {
    const toolGroup = getToolGroup(toolGroupId);
    if (toolGroup === undefined) {
        throw new Error(`ToolGroup with ToolGroupId ${toolGroupId} does not exist`);
    }
    const { viewportsInfo } = toolGroup;
    for (const viewportInfo of viewportsInfo) {
        const { viewportId, renderingEngineId } = viewportInfo;
        const enabledElement = getEnabledElementByIds(viewportId, renderingEngineId);
        removeContourFromElement(enabledElement.viewport.element, segmentationRepresentationUID);
    }
}
export default {
    render,
    addSegmentationRepresentation,
    removeSegmentationRepresentation,
};
//# sourceMappingURL=contourDisplay.js.map