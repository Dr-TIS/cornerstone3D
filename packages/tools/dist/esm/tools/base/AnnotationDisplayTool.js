import { utilities, getEnabledElement, StackViewport, cache, } from '@cornerstonejs/core';
import BaseTool from './BaseTool';
import { getAnnotationManager } from '../../stateManagement/annotation/annotationState';
import triggerAnnotationRender from '../../utilities/triggerAnnotationRender';
import filterAnnotationsForDisplay from '../../utilities/planar/filterAnnotationsForDisplay';
import { getStyleProperty } from '../../stateManagement/annotation/config/helpers';
import { getState } from '../../stateManagement/annotation/config';
class AnnotationDisplayTool extends BaseTool {
    constructor() {
        super(...arguments);
        this.onImageSpacingCalibrated = (evt) => {
            const { element, imageId } = evt.detail;
            const imageURI = utilities.imageIdToURI(imageId);
            const annotationManager = getAnnotationManager();
            const framesOfReference = annotationManager.getFramesOfReference();
            framesOfReference.forEach((frameOfReference) => {
                const frameOfReferenceSpecificAnnotations = annotationManager.getAnnotations(frameOfReference);
                const toolSpecificAnnotations = frameOfReferenceSpecificAnnotations[this.getToolName()];
                if (!toolSpecificAnnotations || !toolSpecificAnnotations.length) {
                    return;
                }
                toolSpecificAnnotations.forEach((annotation) => {
                    const referencedImageURI = utilities.imageIdToURI(annotation.metadata.referencedImageId);
                    if (referencedImageURI === imageURI) {
                        annotation.invalidated = true;
                        annotation.data.cachedStats = {};
                    }
                });
                triggerAnnotationRender(element);
            });
        };
    }
    filterInteractableAnnotationsForElement(element, annotations) {
        if (!annotations || !annotations.length) {
            return;
        }
        const enabledElement = getEnabledElement(element);
        const { viewport } = enabledElement;
        return filterAnnotationsForDisplay(viewport, annotations);
    }
    getReferencedImageId(viewport, worldPos, viewPlaneNormal, viewUp) {
        const targetId = this.getTargetId(viewport);
        let referencedImageId;
        if (viewport instanceof StackViewport) {
            referencedImageId = targetId.split('imageId:')[1];
        }
        else {
            const volumeId = targetId.split('volumeId:')[1];
            const imageVolume = cache.getVolume(volumeId);
            referencedImageId = utilities.getClosestImageId(imageVolume, worldPos, viewPlaneNormal);
        }
        return referencedImageId;
    }
    getStyle(property, specifications, annotation) {
        return getStyleProperty(property, specifications, getState(annotation), this.mode);
    }
}
AnnotationDisplayTool.toolName = 'AnnotationDisplayTool';
export default AnnotationDisplayTool;
//# sourceMappingURL=AnnotationDisplayTool.js.map