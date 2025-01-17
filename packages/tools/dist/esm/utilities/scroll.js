import { StackViewport, VolumeViewport, eventTarget, EVENTS, utilities as csUtils, getEnabledElement, } from '@cornerstonejs/core';
export default function scroll(viewport, options) {
    const enabledElement = getEnabledElement(viewport.element);
    if (!enabledElement) {
        throw new Error('Scroll::Viewport is not enabled (it might be disabled)');
    }
    if (viewport instanceof StackViewport &&
        viewport.getImageIds().length === 0) {
        throw new Error('Scroll::Stack Viewport has no images');
    }
    const { type: viewportType } = viewport;
    const { volumeId, delta } = options;
    if (viewport instanceof StackViewport) {
        viewport.scroll(delta, options.debounceLoading, options.loop);
    }
    else if (viewport instanceof VolumeViewport) {
        scrollVolume(viewport, volumeId, delta);
    }
    else {
        throw new Error(`Not implemented for Viewport Type: ${viewportType}`);
    }
}
export function scrollVolume(viewport, volumeId, delta) {
    const { numScrollSteps, currentStepIndex, sliceRangeInfo } = csUtils.getVolumeViewportScrollInfo(viewport, volumeId);
    if (!sliceRangeInfo) {
        return;
    }
    const { sliceRange, spacingInNormalDirection, camera } = sliceRangeInfo;
    const { focalPoint, viewPlaneNormal, position } = camera;
    const { newFocalPoint, newPosition } = csUtils.snapFocalPointToSlice(focalPoint, position, sliceRange, viewPlaneNormal, spacingInNormalDirection, delta);
    viewport.setCamera({
        focalPoint: newFocalPoint,
        position: newPosition,
    });
    viewport.render();
    const desiredStepIndex = currentStepIndex + delta;
    if ((desiredStepIndex > numScrollSteps || desiredStepIndex < 0) &&
        viewport.getCurrentImageId()) {
        const VolumeScrollEventDetail = {
            volumeId,
            viewport,
            delta,
            desiredStepIndex,
            currentStepIndex,
            numScrollSteps,
            currentImageId: viewport.getCurrentImageId(),
        };
        csUtils.triggerEvent(eventTarget, EVENTS.VOLUME_SCROLL_OUT_OF_BOUNDS, VolumeScrollEventDetail);
    }
}
//# sourceMappingURL=scroll.js.map