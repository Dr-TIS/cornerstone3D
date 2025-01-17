import { state } from '../store';
import { getEnabledElement } from '@cornerstonejs/core';
const VIEWPORT_ELEMENT = 'viewport-element';
function getSvgDrawingHelper(element) {
    const enabledElement = getEnabledElement(element);
    const { viewportId, renderingEngineId } = enabledElement;
    const canvasHash = `${viewportId}:${renderingEngineId}`;
    const svgLayerElement = _getSvgLayer(element);
    Object.keys(state.svgNodeCache[canvasHash]).forEach((cacheKey) => {
        state.svgNodeCache[canvasHash][cacheKey].touched = false;
    });
    return {
        svgLayerElement: svgLayerElement,
        svgNodeCacheForCanvas: state.svgNodeCache,
        getSvgNode: getSvgNode.bind(this, canvasHash),
        appendNode: appendNode.bind(this, svgLayerElement, canvasHash),
        setNodeTouched: setNodeTouched.bind(this, canvasHash),
        clearUntouched: clearUntouched.bind(this, svgLayerElement, canvasHash),
    };
}
function _getSvgLayer(element) {
    const viewportElement = `.${VIEWPORT_ELEMENT}`;
    const internalDivElement = element.querySelector(viewportElement);
    const svgLayer = internalDivElement.querySelector('.svg-layer');
    return svgLayer;
}
function getSvgNode(canvasHash, cacheKey) {
    if (!state.svgNodeCache[canvasHash]) {
        return;
    }
    if (state.svgNodeCache[canvasHash][cacheKey]) {
        return state.svgNodeCache[canvasHash][cacheKey].domRef;
    }
}
function appendNode(svgLayerElement, canvasHash, svgNode, cacheKey) {
    if (!state.svgNodeCache[canvasHash]) {
        return null;
    }
    state.svgNodeCache[canvasHash][cacheKey] = {
        touched: true,
        domRef: svgNode,
    };
    svgLayerElement.appendChild(svgNode);
}
function setNodeTouched(canvasHash, cacheKey) {
    if (!state.svgNodeCache[canvasHash]) {
        return;
    }
    if (state.svgNodeCache[canvasHash][cacheKey]) {
        state.svgNodeCache[canvasHash][cacheKey].touched = true;
    }
}
function clearUntouched(svgLayerElement, canvasHash) {
    if (!state.svgNodeCache[canvasHash]) {
        return;
    }
    Object.keys(state.svgNodeCache[canvasHash]).forEach((cacheKey) => {
        const cacheEntry = state.svgNodeCache[canvasHash][cacheKey];
        if (!cacheEntry.touched && cacheEntry.domRef) {
            svgLayerElement.removeChild(cacheEntry.domRef);
            delete state.svgNodeCache[canvasHash][cacheKey];
        }
    });
}
export default getSvgDrawingHelper;
//# sourceMappingURL=getSvgDrawingHelper.js.map