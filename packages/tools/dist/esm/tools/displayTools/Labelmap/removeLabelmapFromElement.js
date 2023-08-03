import { getEnabledElement } from '@cornerstonejs/core';
function removeLabelmapFromElement(element, segmentationRepresentationUID, removeFromCache = false) {
    const enabledElement = getEnabledElement(element);
    const { viewport } = enabledElement;
    viewport.removeVolumeActors([
        segmentationRepresentationUID,
    ]);
}
export default removeLabelmapFromElement;
//# sourceMappingURL=removeLabelmapFromElement.js.map