"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@cornerstonejs/core");
function removeLabelmapFromElement(element, segmentationRepresentationUID, removeFromCache = false) {
    const enabledElement = (0, core_1.getEnabledElement)(element);
    const { viewport } = enabledElement;
    viewport.removeVolumeActors([
        segmentationRepresentationUID,
    ]);
}
exports.default = removeLabelmapFromElement;
//# sourceMappingURL=removeLabelmapFromElement.js.map