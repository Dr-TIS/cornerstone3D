"use strict";
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
const SegmentationRepresentations_1 = __importDefault(require("../../enums/SegmentationRepresentations"));
const ToolGroupManager_1 = require("../../store/ToolGroupManager");
const Labelmap_1 = require("../../tools/displayTools/Labelmap");
const Contour_1 = require("../../tools/displayTools/Contour");
function addSegmentationRepresentations(toolGroupId, representationInputArray, toolGroupSpecificRepresentationConfig) {
    return __awaiter(this, void 0, void 0, function* () {
        const toolGroup = (0, ToolGroupManager_1.getToolGroup)(toolGroupId);
        if (!toolGroup) {
            throw new Error(`No tool group found for toolGroupId: ${toolGroupId}`);
        }
        const promises = representationInputArray.map((representationInput) => {
            return _addSegmentationRepresentation(toolGroupId, representationInput, toolGroupSpecificRepresentationConfig);
        });
        const segmentationRepresentationUIDs = yield Promise.all(promises);
        return segmentationRepresentationUIDs;
    });
}
function _addSegmentationRepresentation(toolGroupId, representationInput, toolGroupSpecificRepresentationConfig) {
    return __awaiter(this, void 0, void 0, function* () {
        let segmentationRepresentationUID;
        if (representationInput.type === SegmentationRepresentations_1.default.Labelmap) {
            segmentationRepresentationUID =
                yield Labelmap_1.labelmapDisplay.addSegmentationRepresentation(toolGroupId, representationInput, toolGroupSpecificRepresentationConfig);
        }
        else if (representationInput.type === SegmentationRepresentations_1.default.Contour) {
            segmentationRepresentationUID =
                yield Contour_1.contourDisplay.addSegmentationRepresentation(toolGroupId, representationInput, toolGroupSpecificRepresentationConfig);
        }
        else {
            throw new Error(`The representation type ${representationInput.type} is not supported`);
        }
        return segmentationRepresentationUID;
    });
}
exports.default = addSegmentationRepresentations;
//# sourceMappingURL=addSegmentationRepresentations.js.map