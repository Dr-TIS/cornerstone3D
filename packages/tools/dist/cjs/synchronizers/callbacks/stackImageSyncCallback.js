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
const gl_matrix_1 = require("gl-matrix");
const core_1 = require("@cornerstonejs/core");
const utilities_1 = require("../../utilities");
const areViewportsCoplanar_1 = __importDefault(require("./areViewportsCoplanar "));
function stackImageSyncCallback(synchronizerInstance, sourceViewport, targetViewport) {
    return __awaiter(this, void 0, void 0, function* () {
        const renderingEngine = (0, core_1.getRenderingEngine)(targetViewport.renderingEngineId);
        if (!renderingEngine) {
            throw new Error(`No RenderingEngine for Id: ${targetViewport.renderingEngineId}`);
        }
        const sViewport = renderingEngine.getViewport(sourceViewport.viewportId);
        const tViewport = renderingEngine.getViewport(targetViewport.viewportId);
        const frameOfReferenceUID1 = sViewport.getFrameOfReferenceUID();
        const frameOfReferenceUID2 = tViewport.getFrameOfReferenceUID();
        const imageId1 = sViewport.getCurrentImageId();
        const imagePlaneModule1 = core_1.metaData.get('imagePlaneModule', imageId1);
        const sourceImagePositionPatient = imagePlaneModule1.imagePositionPatient;
        const targetImageIds = tViewport.getImageIds();
        if (!(0, areViewportsCoplanar_1.default)(sViewport, tViewport)) {
            return;
        }
        if (frameOfReferenceUID1 === frameOfReferenceUID2) {
            const closestImageIdIndex = _getClosestImageIdIndex(sourceImagePositionPatient, targetImageIds);
            if (closestImageIdIndex.index !== -1 &&
                tViewport.getCurrentImageIdIndex() !== closestImageIdIndex.index) {
                yield (0, utilities_1.jumpToSlice)(tViewport.element, {
                    imageIndex: closestImageIdIndex.index,
                });
                return;
            }
        }
        else {
            const registrationMatrixMat4 = core_1.utilities.spatialRegistrationMetadataProvider.get('spatialRegistrationModule', [targetViewport.viewportId, sourceViewport.viewportId]);
            if (!registrationMatrixMat4) {
                throw new Error(`No registration matrix found for sourceViewport: ${sourceViewport.viewportId} and targetViewport: ${targetViewport.viewportId}, viewports with different frameOfReferenceUIDs must have a registration matrix in the registrationMetadataProvider. Use calculateViewportsRegistrationMatrix to calculate the matrix.`);
            }
            const targetImagePositionPatientWithRegistrationMatrix = gl_matrix_1.vec3.transformMat4(gl_matrix_1.vec3.create(), sourceImagePositionPatient, registrationMatrixMat4);
            const closestImageIdIndex2 = _getClosestImageIdIndex(targetImagePositionPatientWithRegistrationMatrix, targetImageIds);
            if (closestImageIdIndex2.index !== -1 &&
                tViewport.getCurrentImageIdIndex() !== closestImageIdIndex2.index) {
                yield (0, utilities_1.jumpToSlice)(tViewport.element, {
                    imageIndex: closestImageIdIndex2.index,
                });
            }
        }
    });
}
exports.default = stackImageSyncCallback;
function _getClosestImageIdIndex(targetPoint, imageIds) {
    return imageIds.reduce((closestImageIdIndex, imageId, index) => {
        const { imagePositionPatient } = core_1.metaData.get('imagePlaneModule', imageId);
        const distance = gl_matrix_1.vec3.distance(imagePositionPatient, targetPoint);
        if (distance < closestImageIdIndex.distance) {
            return {
                distance,
                index,
            };
        }
        return closestImageIdIndex;
    }, {
        distance: Infinity,
        index: -1,
    });
}
//# sourceMappingURL=stackImageSyncCallback.js.map