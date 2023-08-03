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
exports.setSegmentsVisibility = exports.setSegmentVisibility = exports.getSegmentationVisibility = exports.setSegmentationVisibility = void 0;
const core_1 = require("@cornerstonejs/core");
const SegmentationState = __importStar(require("../../../stateManagement/segmentation/segmentationState"));
const segmentationState_1 = require("../../../stateManagement/segmentation/segmentationState");
const triggerSegmentationEvents_1 = require("../triggerSegmentationEvents");
const SegmentationRepresentations_1 = __importDefault(require("../../../enums/SegmentationRepresentations"));
function getSegmentationIndices(segmentationId) {
    var _a;
    const segmentation = SegmentationState.getSegmentation(segmentationId);
    if (segmentation.type === SegmentationRepresentations_1.default.Labelmap) {
        const volume = core_1.cache.getVolume(segmentationId);
        const scalarData = volume.getScalarData();
        const keySet = {};
        for (let i = 0; i < scalarData.length; i++) {
            const segmentIndex = scalarData[i];
            if (segmentIndex !== 0 && !keySet[segmentIndex]) {
                keySet[segmentIndex] = true;
            }
        }
        return Object.keys(keySet).map((it) => parseInt(it, 10));
    }
    else if (segmentation.type === SegmentationRepresentations_1.default.Contour) {
        const geometryIds = (_a = segmentation.representationData.CONTOUR) === null || _a === void 0 ? void 0 : _a.geometryIds;
        if (!geometryIds) {
            throw new Error(`No geometryIds found for segmentationId ${segmentationId}`);
        }
        return geometryIds.map((geometryId) => {
            const geometry = core_1.cache.getGeometry(geometryId);
            return geometry.data.getSegmentIndex();
        });
    }
}
function setSegmentationVisibility(toolGroupId, segmentationRepresentationUID, visibility) {
    const toolGroupSegmentationRepresentations = (0, segmentationState_1.getSegmentationRepresentations)(toolGroupId);
    if (!toolGroupSegmentationRepresentations) {
        return;
    }
    const representation = toolGroupSegmentationRepresentations.find((representation) => representation.segmentationRepresentationUID ===
        segmentationRepresentationUID);
    if (!representation) {
        return;
    }
    const { segmentsHidden, segmentationId } = representation;
    const indices = getSegmentationIndices(segmentationId);
    if (visibility) {
        segmentsHidden.clear();
    }
    else {
        indices.forEach((index) => {
            segmentsHidden.add(index);
        });
    }
    (0, triggerSegmentationEvents_1.triggerSegmentationRepresentationModified)(toolGroupId, representation.segmentationRepresentationUID);
}
exports.setSegmentationVisibility = setSegmentationVisibility;
function getSegmentationVisibility(toolGroupId, segmentationRepresentationUID) {
    const toolGroupSegmentationRepresentations = (0, segmentationState_1.getSegmentationRepresentations)(toolGroupId);
    const representation = toolGroupSegmentationRepresentations.find((representation) => representation.segmentationRepresentationUID ===
        segmentationRepresentationUID);
    if (!representation) {
        return;
    }
    const { segmentsHidden } = representation;
    return segmentsHidden.size === 0;
}
exports.getSegmentationVisibility = getSegmentationVisibility;
function setSegmentsVisibility(toolGroupId, segmentationRepresentationUID, segmentIndices, visibility) {
    const segRepresentation = SegmentationState.getSegmentationRepresentationByUID(toolGroupId, segmentationRepresentationUID);
    if (!segRepresentation) {
        return;
    }
    segmentIndices.forEach((segmentIndex) => {
        visibility
            ? segRepresentation.segmentsHidden.delete(segmentIndex)
            : segRepresentation.segmentsHidden.add(segmentIndex);
    });
    (0, triggerSegmentationEvents_1.triggerSegmentationRepresentationModified)(toolGroupId, segmentationRepresentationUID);
}
exports.setSegmentsVisibility = setSegmentsVisibility;
function setSegmentVisibility(toolGroupId, segmentationRepresentationUID, segmentIndex, visibility) {
    const segRepresentation = SegmentationState.getSegmentationRepresentationByUID(toolGroupId, segmentationRepresentationUID);
    if (!segRepresentation) {
        return;
    }
    visibility
        ? segRepresentation.segmentsHidden.delete(segmentIndex)
        : segRepresentation.segmentsHidden.add(segmentIndex);
    (0, triggerSegmentationEvents_1.triggerSegmentationRepresentationModified)(toolGroupId, segmentationRepresentationUID);
}
exports.setSegmentVisibility = setSegmentVisibility;
//# sourceMappingURL=segmentationVisibility.js.map