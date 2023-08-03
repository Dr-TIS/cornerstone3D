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
const core_1 = require("@cornerstonejs/core");
const SegmentationRepresentations_1 = __importDefault(require("../../../enums/SegmentationRepresentations"));
const SegmentationConfig = __importStar(require("../../../stateManagement/segmentation/config/segmentationConfig"));
const SegmentationState = __importStar(require("../../../stateManagement/segmentation/segmentationState"));
const ToolGroupManager_1 = require("../../../store/ToolGroupManager");
const addOrUpdateContourSets_1 = require("./addOrUpdateContourSets");
const removeContourFromElement_1 = __importDefault(require("./removeContourFromElement"));
const contourConfigCache_1 = require("./contourConfigCache");
function addSegmentationRepresentation(toolGroupId, representationInput, toolGroupSpecificConfig) {
    return __awaiter(this, void 0, void 0, function* () {
        const { segmentationId } = representationInput;
        const segmentationRepresentationUID = core_1.utilities.uuidv4();
        const segmentsHidden = new Set();
        const visibility = true;
        const colorLUTIndex = 0;
        const active = true;
        const toolGroupSpecificRepresentation = {
            segmentationId,
            segmentationRepresentationUID,
            type: SegmentationRepresentations_1.default.Contour,
            segmentsHidden,
            colorLUTIndex,
            active,
            segmentationRepresentationSpecificConfig: {},
            segmentSpecificConfig: {},
            config: {},
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
    _removeContourFromToolGroupViewports(toolGroupId, segmentationRepresentationUID);
    SegmentationState.removeSegmentationRepresentation(toolGroupId, segmentationRepresentationUID);
    (0, contourConfigCache_1.deleteConfigCache)(segmentationRepresentationUID);
    if (renderImmediate) {
        const viewportsInfo = (0, ToolGroupManager_1.getToolGroup)(toolGroupId).getViewportsInfo();
        viewportsInfo.forEach(({ viewportId, renderingEngineId }) => {
            const enabledElement = (0, core_1.getEnabledElementByIds)(viewportId, renderingEngineId);
            enabledElement.viewport.render();
        });
    }
}
function render(viewport, representationConfig, toolGroupConfig) {
    return __awaiter(this, void 0, void 0, function* () {
        const { segmentationId } = representationConfig;
        const segmentation = SegmentationState.getSegmentation(segmentationId);
        const contourData = segmentation.representationData[SegmentationRepresentations_1.default.Contour];
        const { geometryIds } = contourData;
        if (!(geometryIds === null || geometryIds === void 0 ? void 0 : geometryIds.length)) {
            console.warn(`No contours found for segmentationId ${segmentationId}. Skipping render.`);
        }
        (0, addOrUpdateContourSets_1.addOrUpdateContourSets)(viewport, geometryIds, representationConfig, toolGroupConfig);
    });
}
function _removeContourFromToolGroupViewports(toolGroupId, segmentationRepresentationUID) {
    const toolGroup = (0, ToolGroupManager_1.getToolGroup)(toolGroupId);
    if (toolGroup === undefined) {
        throw new Error(`ToolGroup with ToolGroupId ${toolGroupId} does not exist`);
    }
    const { viewportsInfo } = toolGroup;
    for (const viewportInfo of viewportsInfo) {
        const { viewportId, renderingEngineId } = viewportInfo;
        const enabledElement = (0, core_1.getEnabledElementByIds)(viewportId, renderingEngineId);
        (0, removeContourFromElement_1.default)(enabledElement.viewport.element, segmentationRepresentationUID);
    }
}
exports.default = {
    render,
    addSegmentationRepresentation,
    removeSegmentationRepresentation,
};
//# sourceMappingURL=contourDisplay.js.map