import { getEnabledElement, addVolumesToViewports, Enums, } from '@cornerstonejs/core';
async function addLabelmapToElement(element, volumeId, segmentationRepresentationUID) {
    const enabledElement = getEnabledElement(element);
    const { renderingEngine, viewport } = enabledElement;
    const { id: viewportId } = viewport;
    const visibility = true;
    const immediateRender = false;
    const suppressEvents = true;
    const volumeInputs = [
        {
            volumeId,
            actorUID: segmentationRepresentationUID,
            visibility,
            blendMode: Enums.BlendModes.MAXIMUM_INTENSITY_BLEND,
        },
    ];
    await addVolumesToViewports(renderingEngine, volumeInputs, [viewportId], immediateRender, suppressEvents);
}
export default addLabelmapToElement;
//# sourceMappingURL=addLabelmapToElement.js.map