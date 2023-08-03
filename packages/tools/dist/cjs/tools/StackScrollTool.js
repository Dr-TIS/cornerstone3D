"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@cornerstonejs/core");
const base_1 = require("./base");
const utilities_1 = require("../utilities");
class StackScrollTool extends base_1.BaseTool {
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
        const { viewport } = (0, core_1.getEnabledElementByIds)(viewportId, renderingEngineId);
        const targetId = this.getTargetId(viewport);
        const { debounceIfNotLoaded, invert, loop } = this.configuration;
        const deltaPointY = deltaPoints.canvas[1];
        let volumeId;
        if (viewport instanceof core_1.VolumeViewport) {
            volumeId = targetId.split('volumeId:')[1];
        }
        const pixelsPerImage = this._getPixelPerImage(viewport);
        const deltaY = deltaPointY + this.deltaY;
        if (!pixelsPerImage) {
            return;
        }
        if (Math.abs(deltaY) >= pixelsPerImage) {
            const imageIdIndexOffset = Math.round(deltaY / pixelsPerImage);
            (0, utilities_1.scroll)(viewport, {
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
        if (viewport instanceof core_1.VolumeViewport) {
            const { numberOfSlices } = core_1.utilities.getImageSliceDataForVolumeViewport(viewport);
            return numberOfSlices;
        }
        else if (viewport instanceof core_1.StackViewport) {
            return viewport.getImageIds().length;
        }
    }
}
StackScrollTool.toolName = 'StackScroll';
exports.default = StackScrollTool;
//# sourceMappingURL=StackScrollTool.js.map