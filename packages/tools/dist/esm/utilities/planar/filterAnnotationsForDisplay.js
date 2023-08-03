import { StackViewport, VolumeViewport, utilities as csUtils, } from '@cornerstonejs/core';
import filterAnnotationsWithinSlice from './filterAnnotationsWithinSlice';
export default function filterAnnotationsForDisplay(viewport, annotations) {
    if (viewport instanceof StackViewport) {
        const imageId = viewport.getCurrentImageId();
        const colonIndex = imageId.indexOf(':');
        const imageURI = imageId.substring(colonIndex + 1);
        return annotations.filter((annotation) => {
            if (!annotation.isVisible) {
                return false;
            }
            const imageId = annotation.metadata.referencedImageId;
            if (imageId === undefined) {
                return false;
            }
            const colonIndex = imageId.indexOf(':');
            const referenceImageURI = imageId.substring(colonIndex + 1);
            return referenceImageURI === imageURI;
        });
    }
    else if (viewport instanceof VolumeViewport) {
        const camera = viewport.getCamera();
        const { spacingInNormalDirection } = csUtils.getTargetVolumeAndSpacingInNormalDir(viewport, camera);
        return filterAnnotationsWithinSlice(annotations, camera, spacingInNormalDirection);
    }
    else {
        throw new Error(`Viewport Type ${viewport.type} not supported`);
    }
}
//# sourceMappingURL=filterAnnotationsForDisplay.js.map