import { getRenderingEngines, utilities } from '@cornerstonejs/core';
const autoLoad = (volumeId) => {
    const renderingEngineAndViewportIds = getRenderingEngineAndViewportsContainingVolume(volumeId);
    if (!renderingEngineAndViewportIds || !renderingEngineAndViewportIds.length) {
        return;
    }
    renderingEngineAndViewportIds.forEach(({ renderingEngine, viewportIds }) => {
        if (!renderingEngine.hasBeenDestroyed) {
            renderingEngine.renderViewports(viewportIds);
        }
    });
};
function getRenderingEngineAndViewportsContainingVolume(volumeId) {
    const renderingEnginesArray = getRenderingEngines();
    const renderingEngineAndViewportIds = [];
    for (let i = 0; i < renderingEnginesArray.length; i++) {
        const renderingEngine = renderingEnginesArray[i];
        const viewports = utilities.getViewportsWithVolumeId(volumeId, renderingEngine.id);
        if (viewports.length) {
            renderingEngineAndViewportIds.push({
                renderingEngine,
                viewportIds: viewports.map((viewport) => viewport.id),
            });
        }
    }
    return renderingEngineAndViewportIds;
}
export default autoLoad;
//# sourceMappingURL=autoLoad.js.map