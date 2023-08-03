import { getEnabledElementByIds, VolumeViewport, StackViewport, utilities as csUtils, } from '@cornerstonejs/core';
import { BaseTool } from './base';
import { scroll } from '../utilities';
class StackScrollTool extends BaseTool {
    constructor(toolProps = {}, defaultToolProps = {
        supportedInteractionTypes: ['Mouse', 'Touch'],
        configuration: {
            invert: false,
            debounceIfNotLoaded: true,
            loop: false,
        },
    }) {
        super(toolProps, defaultToolProps);
        this.deltaY = 1;
    }
    mouseDragCallback(evt) {
        this._dragCallback(evt);
    }
    touchDragCallback(evt) {
        this._dragCallback(evt);
    }
    _dragCallback(evt) {
        const { deltaPoints, viewportId, renderingEngineId } = evt.detail;
        const { viewport } = getEnabledElementByIds(viewportId, renderingEngineId);
        const targetId = this.getTargetId(viewport);
        const { debounceIfNotLoaded, invert, loop } = this.configuration;
        const deltaPointY = deltaPoints.canvas[1];
        let volumeId;
        if (viewport instanceof VolumeViewport) {
            volumeId = targetId.split('volumeId:')[1];
        }
        const pixelsPerImage = this._getPixelPerImage(viewport);
        const deltaY = deltaPointY + this.deltaY;
        if (!pixelsPerImage) {
            return;
        }
        if (Math.abs(deltaY) >= pixelsPerImage) {
            const imageIdIndexOffset = Math.round(deltaY / pixelsPerImage);
            scroll(viewport, {
                delta: invert ? -imageIdIndexOffset : imageIdIndexOffset,
                volumeId,
                debounceLoading: debounceIfNotLoaded,
                loop: loop,
            });
            this.deltaY = deltaY % pixelsPerImage;
        }
        else {
            this.deltaY = deltaY;
        }
    }
    _getPixelPerImage(viewport) {
        const { element } = viewport;
        const numberOfSlices = this._getNumberOfSlices(viewport);
        return Math.max(2, element.offsetHeight / Math.max(numberOfSlices, 8));
    }
    _getNumberOfSlices(viewport) {
        if (viewport instanceof VolumeViewport) {
            const { numberOfSlices } = csUtils.getImageSliceDataForVolumeViewport(viewport);
            return numberOfSlices;
        }
        else if (viewport instanceof StackViewport) {
            return viewport.getImageIds().length;
        }
    }
}
StackScrollTool.toolName = 'StackScroll';
export default StackScrollTool;
//# sourceMappingURL=StackScrollTool.js.map