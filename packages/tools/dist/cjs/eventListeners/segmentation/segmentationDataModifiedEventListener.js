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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@cornerstonejs/core");
const triggerSegmentationRender_1 = __importDefault(require("../../utilities/segmentation/triggerSegmentationRender"));
const SegmentationRepresentations_1 = __importDefault(require("../../enums/SegmentationRepresentations"));
const SegmentationState = __importStar(require("../../stateManagement/segmentation/segmentationState"));
const onSegmentationDataModified = function (evt) {
    const { segmentationId, modifiedSlicesToUse } = evt.detail;
    const { representationData, type } = SegmentationState.getSegmentation(segmentationId);
    let toolGroupIds;
    if (type === SegmentationRepresentations_1.default.Labelmap) {
        const segmentationVolume = core_1.cache.getVolume(representationData[type].volumeId);
        if (!segmentationVolume) {
            console.warn('segmentation not found in cache');
            return;
        }
        const { imageData, vtkOpenGLTexture } = segmentationVolume;
        let slicesToUpdate;
        if (modifiedSlicesToUse && Array.isArray(modifiedSlicesToUse)) {
            slicesToUpdate = modifiedSlicesToUse;
        }
        else {
            const numSlices = imageData.getDimensions()[2];
            slicesToUpdate = [...Array(numSlices).keys()];
        }
        slicesToUpdate.forEach((i) => {
            vtkOpenGLTexture.setUpdatedFrame(i);
        });
        imageData.modified();
        toolGroupIds =
            SegmentationState.getToolGroupIdsWithSegmentation(segmentationId);
    }
    else {
        throw new Error(`onSegmentationDataModified: representationType ${type} not supported yet`);
    }
    toolGroupIds.forEach((toolGroupId) => {
        (0, triggerSegmentationRender_1.default)(toolGroupId);
    });
};
exports.default = onSegmentationDataModified;
//# sourceMappingURL=segmentationDataModifiedEventListener.js.map