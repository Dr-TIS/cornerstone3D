"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isViewportPreScaled = void 0;
const core_1 = require("@cornerstonejs/core");
function isViewportPreScaled(viewport, targetId) {
    if (viewport instanceof core_1.BaseVolumeViewport) {
        const volumeId = targetId.split('volumeId:')[1];
        const volume = core_1.cache.getVolume(volumeId);
        return !!(volume === null || volume === void 0 ? void 0 : volume.scaling) && Object.keys(volume.scaling).length > 0;
    }
    else if (viewport instanceof core_1.StackViewport) {
        const { preScale } = viewport.getImageData() || {};
        return !!(preScale === null || preScale === void 0 ? void 0 : preScale.scaled);
    }
    else {
        throw new Error('Viewport is not a valid type');
    }
}
exports.isViewportPreScaled = isViewportPreScaled;
//# sourceMappingURL=isViewportPreScaled.js.map