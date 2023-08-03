import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import { cache, getEnabledElementByIds, utilities, } from '@cornerstonejs/core';
import Representations from '../../../enums/SegmentationRepresentations';
import * as SegmentationConfig from '../../../stateManagement/segmentation/config/segmentationConfig';
import * as SegmentationState from '../../../stateManagement/segmentation/segmentationState';
import { getToolGroup } from '../../../store/ToolGroupManager';
import addLabelmapToElement from './addLabelmapToElement';
import removeLabelmapFromElement from './removeLabelmapFromElement';
const MAX_NUMBER_COLORS = 255;
const labelMapConfigCache = new Map();
async function addSegmentationRepresentation(toolGroupId, representationInput, toolGroupSpecificConfig) {
    const { segmentationId } = representationInput;
    const segmentationRepresentationUID = utilities.uuidv4();
    const segmentsHidden = new Set();
    const colorLUTIndex = 0;
    const active = true;
    const cfun = vtkColorTransferFunction.newInstance();
    const ofun = vtkPiecewiseFunction.newInstance();
    ofun.addPoint(0, 0);
    const toolGroupSpecificRepresentation = {
        segmentationId,
        segmentationRepresentationUID,
        type: Representations.Labelmap,
        segmentsHidden,
        colorLUTIndex,
        active,
        segmentationRepresentationSpecificConfig: {},
        segmentSpecificConfig: {},
        config: {
            cfun,
            ofun,
        },
    };
    if (toolGroupSpecificConfig) {
        const currentToolGroupConfig = SegmentationConfig.getToolGroupSpecificConfig(toolGroupId);
        const mergedConfig = utilities.deepMerge(currentToolGroupConfig, toolGroupSpecificConfig);
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
    _removeLabelmapFromToolGroupViewports(toolGroupId, segmentationRepresentationUID);
    SegmentationState.removeSegmentationRepresentation(toolGroupId, segmentationRepresentationUID);
    if (renderImmediate) {
        const viewportsInfo = getToolGroup(toolGroupId).getViewportsInfo();
        viewportsInfo.forEach(({ viewportId, renderingEngineId }) => {
            const enabledElement = getEnabledElementByIds(viewportId, renderingEngineId);
            enabledElement.viewport.render();
        });
    }
}
function isSameFrameOfReference(viewport, referencedVolumeId) {
    if (!referencedVolumeId) {
        return true;
    }
    const defaultActor = viewport.getDefaultActor();
    if (!defaultActor) {
        return false;
    }
    const { uid: defaultActorUID } = defaultActor;
    const volume = cache.getVolume(defaultActorUID);
    if (volume) {
        const referencedVolume = cache.getVolume(referencedVolumeId);
        if (referencedVolume &&
            volume.metadata.FrameOfReferenceUID ===
                referencedVolume.metadata.FrameOfReferenceUID) {
            return true;
        }
    }
    return false;
}
async function render(viewport, representation, toolGroupConfig) {
    const { colorLUTIndex, active, segmentationId, segmentationRepresentationUID, segmentsHidden, config: renderingConfig, } = representation;
    const segmentation = SegmentationState.getSegmentation(segmentationId);
    const labelmapData = segmentation.representationData[Representations.Labelmap];
    const { volumeId: labelmapUID } = labelmapData;
    const labelmap = cache.getVolume(labelmapUID);
    if (!labelmap) {
        throw new Error(`No Labelmap found for volumeId: ${labelmapUID}`);
    }
    if (!isSameFrameOfReference(viewport, labelmapData?.referencedVolumeId)) {
        return;
    }
    let actorEntry = viewport.getActor(segmentationRepresentationUID);
    if (!actorEntry) {
        const segmentation = SegmentationState.getSegmentation(segmentationId);
        const { volumeId } = segmentation.representationData[Representations.Labelmap];
        await _addLabelmapToViewport(viewport, volumeId, segmentationRepresentationUID);
        actorEntry = viewport.getActor(segmentationRepresentationUID);
    }
    if (!actorEntry) {
        return;
    }
    const { cfun, ofun } = renderingConfig;
    const renderInactiveSegmentations = toolGroupConfig.renderInactiveSegmentations;
    _setLabelmapColorAndOpacity(viewport.id, actorEntry, cfun, ofun, colorLUTIndex, toolGroupConfig.representations[Representations.Labelmap], representation, active, renderInactiveSegmentations, segmentsHidden);
}
function _setLabelmapColorAndOpacity(viewportId, actorEntry, cfun, ofun, colorLUTIndex, toolGroupLabelmapConfig, segmentationRepresentation, isActiveLabelmap, renderInactiveSegmentations, segmentsHidden) {
    const { segmentSpecificConfig, segmentationRepresentationSpecificConfig } = segmentationRepresentation;
    const segmentationRepresentationLabelmapConfig = segmentationRepresentationSpecificConfig[Representations.Labelmap];
    const colorLUT = SegmentationState.getColorLUT(colorLUTIndex);
    const numColors = Math.min(256, colorLUT.length);
    const volumeActor = actorEntry.actor;
    const { uid: actorUID } = actorEntry;
    const { outlineWidth, renderOutline, outlineOpacity } = _getLabelmapConfig(toolGroupLabelmapConfig, segmentationRepresentationLabelmapConfig, isActiveLabelmap);
    for (let i = 0; i < numColors; i++) {
        const segmentIndex = i;
        const segmentColor = colorLUT[segmentIndex];
        const segmentSpecificLabelmapConfig = segmentSpecificConfig[segmentIndex]?.[Representations.Labelmap];
        const { fillAlpha, outlineWidth, renderFill, renderOutline } = _getLabelmapConfig(toolGroupLabelmapConfig, segmentationRepresentationLabelmapConfig, isActiveLabelmap, segmentSpecificLabelmapConfig);
        const { forceOpacityUpdate, forceColorUpdate } = _needsTransferFunctionUpdate(viewportId, actorUID, segmentIndex, {
            fillAlpha,
            renderFill,
            renderOutline,
            segmentColor,
            outlineWidth,
            segmentsHidden,
        });
        if (forceColorUpdate) {
            cfun.addRGBPoint(segmentIndex, segmentColor[0] / MAX_NUMBER_COLORS, segmentColor[1] / MAX_NUMBER_COLORS, segmentColor[2] / MAX_NUMBER_COLORS);
        }
        if (forceOpacityUpdate) {
            if (renderFill) {
                const segmentOpacity = segmentsHidden.has(segmentIndex)
                    ? 0
                    : (segmentColor[3] / 255) * fillAlpha;
                ofun.removePoint(segmentIndex);
                ofun.addPointLong(segmentIndex, segmentOpacity, 0.5, 1.0);
            }
            else {
                ofun.addPointLong(segmentIndex, 0.01, 0.5, 1.0);
            }
        }
    }
    volumeActor.getProperty().setRGBTransferFunction(0, cfun);
    ofun.setClamping(false);
    volumeActor.getProperty().setScalarOpacity(0, ofun);
    volumeActor.getProperty().setInterpolationTypeToNearest();
    volumeActor.getProperty().setUseLabelOutline(renderOutline);
    volumeActor.getProperty().setLabelOutlineOpacity(outlineOpacity);
    volumeActor.getProperty().setLabelOutlineThickness(outlineWidth);
    const visible = isActiveLabelmap || renderInactiveSegmentations;
    volumeActor.setVisibility(visible);
}
function _getLabelmapConfig(toolGroupLabelmapConfig, segmentationRepresentationLabelmapConfig, isActiveLabelmap, segmentsLabelmapConfig) {
    const segmentLabelmapConfig = segmentsLabelmapConfig || {};
    const configToUse = {
        ...toolGroupLabelmapConfig,
        ...segmentationRepresentationLabelmapConfig,
        ...segmentLabelmapConfig,
    };
    const fillAlpha = isActiveLabelmap
        ? configToUse.fillAlpha
        : configToUse.fillAlphaInactive;
    const outlineWidth = isActiveLabelmap
        ? configToUse.outlineWidthActive
        : configToUse.outlineWidthInactive;
    const renderFill = isActiveLabelmap
        ? configToUse.renderFill
        : configToUse.renderFillInactive;
    const renderOutline = configToUse.renderOutline;
    const outlineOpacity = isActiveLabelmap
        ? configToUse.outlineOpacity
        : configToUse.outlineOpacityInactive;
    return {
        fillAlpha,
        outlineWidth,
        renderFill,
        renderOutline,
        outlineOpacity,
    };
}
function _needsTransferFunctionUpdate(viewportId, actorUID, segmentIndex, { fillAlpha, renderFill, renderOutline, segmentColor, outlineWidth, segmentsHidden, }) {
    const cacheUID = `${viewportId}-${actorUID}-${segmentIndex}`;
    const oldConfig = labelMapConfigCache.get(cacheUID);
    if (!oldConfig) {
        labelMapConfigCache.set(cacheUID, {
            fillAlpha,
            renderFill,
            renderOutline,
            outlineWidth,
            segmentColor,
            segmentsHidden: new Set(segmentsHidden),
        });
        return {
            forceOpacityUpdate: true,
            forceColorUpdate: true,
        };
    }
    const { fillAlpha: oldFillAlpha, renderFill: oldRenderFill, renderOutline: oldRenderOutline, outlineWidth: oldOutlineWidth, segmentColor: oldSegmentColor, segmentsHidden: oldSegmentsHidden, } = oldConfig;
    const forceColorUpdate = oldSegmentColor[0] !== segmentColor[0] ||
        oldSegmentColor[1] !== segmentColor[1] ||
        oldSegmentColor[2] !== segmentColor[2];
    const forceOpacityUpdate = oldSegmentColor[3] !== segmentColor[3] ||
        oldFillAlpha !== fillAlpha ||
        oldRenderFill !== renderFill ||
        oldRenderOutline !== renderOutline ||
        oldOutlineWidth !== outlineWidth ||
        oldSegmentsHidden.has(segmentIndex) !== segmentsHidden.has(segmentIndex);
    labelMapConfigCache.set(cacheUID, {
        fillAlpha,
        renderFill,
        renderOutline,
        outlineWidth,
        segmentColor: segmentColor.slice(),
        segmentsHidden: new Set(segmentsHidden),
    });
    return {
        forceOpacityUpdate,
        forceColorUpdate,
    };
}
function _removeLabelmapFromToolGroupViewports(toolGroupId, segmentationRepresentationUID) {
    const toolGroup = getToolGroup(toolGroupId);
    if (toolGroup === undefined) {
        throw new Error(`ToolGroup with ToolGroupId ${toolGroupId} does not exist`);
    }
    const { viewportsInfo } = toolGroup;
    for (const viewportInfo of viewportsInfo) {
        const { viewportId, renderingEngineId } = viewportInfo;
        const enabledElement = getEnabledElementByIds(viewportId, renderingEngineId);
        removeLabelmapFromElement(enabledElement.viewport.element, segmentationRepresentationUID);
    }
}
async function _addLabelmapToViewport(viewport, volumeId, segmentationRepresentationUID) {
    await addLabelmapToElement(viewport.element, volumeId, segmentationRepresentationUID);
}
export default {
    render,
    addSegmentationRepresentation,
    removeSegmentationRepresentation,
};
//# sourceMappingURL=labelmapDisplay.js.map