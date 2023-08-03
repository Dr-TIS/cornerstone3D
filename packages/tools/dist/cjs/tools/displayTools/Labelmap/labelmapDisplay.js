"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const PiecewiseFunction_1 = __importDefault(require("@kitware/vtk.js/Common/DataModel/PiecewiseFunction"));
const ColorTransferFunction_1 = __importDefault(require("@kitware/vtk.js/Rendering/Core/ColorTransferFunction"));
const core_1 = require("@cornerstonejs/core");
const SegmentationRepresentations_1 = __importDefault(require("../../../enums/SegmentationRepresentations"));
const SegmentationConfig = __importStar(require("../../../stateManagement/segmentation/config/segmentationConfig"));
const SegmentationState = __importStar(require("../../../stateManagement/segmentation/segmentationState"));
const ToolGroupManager_1 = require("../../../store/ToolGroupManager");
const addLabelmapToElement_1 = __importDefault(require("./addLabelmapToElement"));
const removeLabelmapFromElement_1 = __importDefault(require("./removeLabelmapFromElement"));
const MAX_NUMBER_COLORS = 255;
const labelMapConfigCache = new Map();
function addSegmentationRepresentation(toolGroupId, representationInput, toolGroupSpecificConfig) {
    return __awaiter(this, void 0, void 0, function* () {
        const { segmentationId } = representationInput;
        const segmentationRepresentationUID = core_1.utilities.uuidv4();
        const segmentsHidden = new Set();
        const colorLUTIndex = 0;
        const active = true;
        const cfun = ColorTransferFunction_1.default.newInstance();
        const ofun = PiecewiseFunction_1.default.newInstance();
        ofun.addPoint(0, 0);
        const toolGroupSpecificRepresentation = {
            segmentationId,
            segmentationRepresentationUID,
            type: SegmentationRepresentations_1.default.Labelmap,
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
            const mergedConfig = core_1.utilities.deepMerge(currentToolGroupConfig, toolGroupSpecificConfig);
            SegmentationConfig.setToolGroupSpecificConfig(toolGroupId, {
                renderInactiveSegmentations: mergedConfig.renderInactiveSegmentations || true,
                representations: Object.assign({}, mergedConfig.representations),
            });
        }
        SegmentationState.addSegmentationRepresentation(toolGroupId, toolGroupSpecificRepresentation);
        return segmentationRepresentationUID;
    });
}
function removeSegmentationRepresentation(toolGroupId, segmentationRepresentationUID, renderImmediate = false) {
    _removeLabelmapFromToolGroupViewports(toolGroupId, segmentationRepresentationUID);
    SegmentationState.removeSegmentationRepresentation(toolGroupId, segmentationRepresentationUID);
    if (renderImmediate) {
        const viewportsInfo = (0, ToolGroupManager_1.getToolGroup)(toolGroupId).getViewportsInfo();
        viewportsInfo.forEach(({ viewportId, renderingEngineId }) => {
            const enabledElement = (0, core_1.getEnabledElementByIds)(viewportId, renderingEngineId);
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
    const volume = core_1.cache.getVolume(defaultActorUID);
    if (volume) {
        const referencedVolume = core_1.cache.getVolume(referencedVolumeId);
        if (referencedVolume &&
            volume.metadata.FrameOfReferenceUID ===
                referencedVolume.metadata.FrameOfReferenceUID) {
            return true;
        }
    }
    return false;
}
function render(viewport, representation, toolGroupConfig) {
    return __awaiter(this, void 0, void 0, function* () {
        const { colorLUTIndex, active, segmentationId, segmentationRepresentationUID, segmentsHidden, config: renderingConfig, } = representation;
        const segmentation = SegmentationState.getSegmentation(segmentationId);
        const labelmapData = segmentation.representationData[SegmentationRepresentations_1.default.Labelmap];
        const { volumeId: labelmapUID } = labelmapData;
        const labelmap = core_1.cache.getVolume(labelmapUID);
        if (!labelmap) {
            throw new Error(`No Labelmap found for volumeId: ${labelmapUID}`);
        }
        if (!isSameFrameOfReference(viewport, labelmapData === null || labelmapData === void 0 ? void 0 : labelmapData.referencedVolumeId)) {
            return;
        }
        let actorEntry = viewport.getActor(segmentationRepresentationUID);
        if (!actorEntry) {
            const segmentation = SegmentationState.getSegmentation(segmentationId);
            const { volumeId } = segmentation.representationData[SegmentationRepresentations_1.default.Labelmap];
            yield _addLabelmapToViewport(viewport, volumeId, segmentationRepresentationUID);
            actorEntry = viewport.getActor(segmentationRepresentationUID);
        }
        if (!actorEntry) {
            return;
        }
        const { cfun, ofun } = renderingConfig;
        const renderInactiveSegmentations = toolGroupConfig.renderInactiveSegmentations;
        _setLabelmapColorAndOpacity(viewport.id, actorEntry, cfun, ofun, colorLUTIndex, toolGroupConfig.representations[SegmentationRepresentations_1.default.Labelmap], representation, active, renderInactiveSegmentations, segmentsHidden);
    });
}
function _setLabelmapColorAndOpacity(viewportId, actorEntry, cfun, ofun, colorLUTIndex, toolGroupLabelmapConfig, segmentationRepresentation, isActiveLabelmap, renderInactiveSegmentations, segmentsHidden) {
    var _a;
    const { segmentSpecificConfig, segmentationRepresentationSpecificConfig } = segmentationRepresentation;
    const segmentationRepresentationLabelmapConfig = segmentationRepresentationSpecificConfig[SegmentationRepresentations_1.default.Labelmap];
    const colorLUT = SegmentationState.getColorLUT(colorLUTIndex);
    const numColors = Math.min(256, colorLUT.length);
    const volumeActor = actorEntry.actor;
    const { uid: actorUID } = actorEntry;
    const { outlineWidth, renderOutline, outlineOpacity } = _getLabelmapConfig(toolGroupLabelmapConfig, segmentationRepresentationLabelmapConfig, isActiveLabelmap);
    for (let i = 0; i < numColors; i++) {
        const segmentIndex = i;
        const segmentColor = colorLUT[segmentIndex];
        const segmentSpecificLabelmapConfig = (_a = segmentSpecificConfig[segmentIndex]) === null || _a === void 0 ? void 0 : _a[SegmentationRepresentations_1.default.Labelmap];
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
    const configToUse = Object.assign(Object.assign(Object.assign({}, toolGroupLabelmapConfig), segmentationRepresentationLabelmapConfig), segmentLabelmapConfig);
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
    const toolGroup = (0, ToolGroupManager_1.getToolGroup)(toolGroupId);
    if (toolGroup === undefined) {
        throw new Error(`ToolGroup with ToolGroupId ${toolGroupId} does not exist`);
    }
    const { viewportsInfo } = toolGroup;
    for (const viewportInfo of viewportsInfo) {
        const { viewportId, renderingEngineId } = viewportInfo;
        const enabledElement = (0, core_1.getEnabledElementByIds)(viewportId, renderingEngineId);
        (0, removeLabelmapFromElement_1.default)(enabledElement.viewport.element, segmentationRepresentationUID);
    }
}
function _addLabelmapToViewport(viewport, volumeId, segmentationRepresentationUID) {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, addLabelmapToElement_1.default)(viewport.element, volumeId, segmentationRepresentationUID);
    });
}
exports.default = {
    render,
    addSegmentationRepresentation,
    removeSegmentationRepresentation,
};
//# sourceMappingURL=labelmapDisplay.js.map