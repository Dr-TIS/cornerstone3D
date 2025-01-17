"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrollVolume = void 0;
const core_1 = require("@cornerstonejs/core");
function scroll(viewport, options) {
    const enabledElement = (0, core_1.getEnabledElement)(viewport.element);
    if (!enabledElement) {
        throw new Error('Scroll::Viewport is not enabled (it might be disabled)');
    }
    if (viewport instanceof core_1.StackViewport &&
        viewport.getImageIds().length === 0) {
        throw new Error('Scroll::Stack Viewport has no images');
    }
    const { type: viewportType } = viewport;
    const { volumeId, delta } = options;
    if (viewport instanceof core_1.StackViewport) {
        viewport.scroll(delta, options.debounceLoading, options.loop);
    }
    else if (viewport instanceof core_1.VolumeViewport) {
        scrollVolume(viewport, volumeId, delta);
    }
    else {
        throw new Error(`Not implemented for Viewport Type: ${viewportType}`);
    }
}
exports.default = scroll;
function scrollVolume(viewport, volumeId, delta) {
    const { numScrollSteps, currentStepIndex, sliceRangeInfo } = core_1.utilities.getVolumeViewportScrollInfo(viewport, volumeId);
    if (!sliceRangeInfo) {
        return;
    }
    const { sliceRange, spacingInNormalDirection, camera } = sliceRangeInfo;
    const { focalPoint, viewPlaneNormal, position } = camera;
    const { newFocalPoint, newPosition } = core_1.utilities.snapFocalPointToSlice(focalPoint, position, sliceRange, viewPlaneNormal, spacingInNormalDirection, delta);
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
        core_1.utilities.triggerEvent(core_1.eventTarget, core_1.EVENTS.VOLUME_SCROLL_OUT_OF_BOUNDS, VolumeScrollEventDetail);
    }
}
exports.scrollVolume = scrollVolume;
//# sourceMappingURL=scroll.js.map