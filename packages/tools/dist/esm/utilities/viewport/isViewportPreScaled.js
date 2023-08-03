import { cache, StackViewport, BaseVolumeViewport, } from '@cornerstonejs/core';
function isViewportPreScaled(viewport, targetId) {
    if (viewport instanceof BaseVolumeViewport) {
        const volumeId = targetId.split('volumeId:')[1];
        const volume = cache.getVolume(volumeId);
        return !!volume?.scaling && Object.keys(volume.scaling).length > 0;
    }
    else if (viewport instanceof StackViewport) {
        const { preScale } = viewport.getImageData() || {};
        return !!preScale?.scaled;
    }
    else {
        throw new Error('Viewport is not a valid type');
    }
}
export { isViewportPreScaled };
//# sourceMappingURL=isViewportPreScaled.js.map