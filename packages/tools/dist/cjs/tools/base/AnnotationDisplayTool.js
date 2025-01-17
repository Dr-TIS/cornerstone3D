"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@cornerstonejs/core");
const BaseTool_1 = __importDefault(require("./BaseTool"));
const annotationState_1 = require("../../stateManagement/annotation/annotationState");
const triggerAnnotationRender_1 = __importDefault(require("../../utilities/triggerAnnotationRender"));
const filterAnnotationsForDisplay_1 = __importDefault(require("../../utilities/planar/filterAnnotationsForDisplay"));
const helpers_1 = require("../../stateManagement/annotation/config/helpers");
const config_1 = require("../../stateManagement/annotation/config");
class AnnotationDisplayTool extends BaseTool_1.default {
    constructor() {
        super(...arguments);
        this.onImageSpacingCalibrated = (evt) => {
            const { element, imageId } = evt.detail;
            const imageURI = core_1.utilities.imageIdToURI(imageId);
            const annotationManager = (0, annotationState_1.getAnnotationManager)();
            const framesOfReference = annotationManager.getFramesOfReference();
            framesOfReference.forEach((frameOfReference) => {
                const frameOfReferenceSpecificAnnotations = annotationManager.getAnnotations(frameOfReference);
                const toolSpecificAnnotations = frameOfReferenceSpecificAnnotations[this.getToolName()];
                if (!toolSpecificAnnotations || !toolSpecificAnnotations.length) {
                    return;
                }
                toolSpecificAnnotations.forEach((annotation) => {
                    const referencedImageURI = core_1.utilities.imageIdToURI(annotation.metadata.referencedImageId);
                    if (referencedImageURI === imageURI) {
                        annotation.invalidated = true;
                        annotation.data.cachedStats = {};
                    }
                });
                (0, triggerAnnotationRender_1.default)(element);
            });
        };
    }
    filterInteractableAnnotationsForElement(element, annotations) {
        if (!annotations || !annotations.length) {
            return;
        }
        const enabledElement = (0, core_1.getEnabledElement)(element);
        const { viewport } = enabledElement;
        return (0, filterAnnotationsForDisplay_1.default)(viewport, annotations);
    }
    getReferencedImageId(viewport, worldPos, viewPlaneNormal, viewUp) {
        const targetId = this.getTargetId(viewport);
        let referencedImageId;
        if (viewport instanceof core_1.StackViewport) {
            referencedImageId = targetId.split('imageId:')[1];
        }
        else {
            const volumeId = targetId.split('volumeId:')[1];
            const imageVolume = core_1.cache.getVolume(volumeId);
            referencedImageId = core_1.utilities.getClosestImageId(imageVolume, worldPos, viewPlaneNormal);
        }
        return referencedImageId;
    }
    getStyle(property, specifications, annotation) {
        return (0, helpers_1.getStyleProperty)(property, specifications, (0, config_1.getState)(annotation), this.mode);
    }
}
AnnotationDisplayTool.toolName = 'AnnotationDisplayTool';
exports.default = AnnotationDisplayTool;
//# sourceMappingURL=AnnotationDisplayTool.js.map