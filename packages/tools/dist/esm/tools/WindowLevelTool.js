import { BaseTool } from './base';
import { getEnabledElement, VolumeViewport, StackViewport, utilities, cache, } from '@cornerstonejs/core';
const DEFAULT_MULTIPLIER = 4;
const DEFAULT_IMAGE_DYNAMIC_RANGE = 1024;
const PT = 'PT';
class WindowLevelTool extends BaseTool {
    constructor(toolProps = {}, defaultToolProps = {
        supportedInteractionTypes: ['Mouse', 'Touch'],
    }) {
        super(toolProps, defaultToolProps);
        this._getImageDynamicRangeFromMiddleSlice = (scalarData, dimensions) => {
            const middleSliceIndex = Math.floor(dimensions[2] / 2);
            const frameLength = dimensions[0] * dimensions[1];
            let bytesPerVoxel;
            let TypedArrayConstructor;
            if (scalarData instanceof Float32Array) {
                bytesPerVoxel = 4;
                TypedArrayConstructor = Float32Array;
            }
            else if (scalarData instanceof Uint8Array) {
                bytesPerVoxel = 1;
                TypedArrayConstructor = Uint8Array;
            }
            else if (scalarData instanceof Uint16Array) {
                bytesPerVoxel = 2;
                TypedArrayConstructor = Uint16Array;
            }
            else if (scalarData instanceof Int16Array) {
                bytesPerVoxel = 2;
                TypedArrayConstructor = Int16Array;
            }
            const buffer = scalarData.buffer;
            const byteOffset = middleSliceIndex * frameLength * bytesPerVoxel;
            const frame = new TypedArrayConstructor(buffer, byteOffset, frameLength);
            const { max, min } = this._getMinMax(frame, frameLength);
            return max - min;
        };
    }
    touchDragCallback(evt) {
        this.mouseDragCallback(evt);
    }
    mouseDragCallback(evt) {
        const { element, deltaPoints } = evt.detail;
        const enabledElement = getEnabledElement(element);
        const { renderingEngine, viewport } = enabledElement;
        let volumeId, lower, upper, modality, newRange, viewportsContainingVolumeUID;
        let isPreScaled = false;
        if (viewport instanceof VolumeViewport) {
            const targetId = this.getTargetId(viewport);
            volumeId = targetId.split('volumeId:')[1];
            viewportsContainingVolumeUID = utilities.getViewportsWithVolumeId(volumeId, renderingEngine.id);
            const properties = viewport.getProperties();
            ({ lower, upper } = properties.voiRange);
            const volume = cache.getVolume(volumeId);
            modality = volume.metadata.Modality;
            isPreScaled = volume.scaling && Object.keys(volume.scaling).length > 0;
        }
        else if (viewport instanceof StackViewport) {
            const properties = viewport.getProperties();
            modality = viewport.modality;
            ({ lower, upper } = properties.voiRange);
            const { preScale } = viewport.getImageData();
            isPreScaled =
                preScale.scaled && preScale.scalingParameters?.suvbw !== undefined;
        }
        else {
            throw new Error('Viewport is not a valid type');
        }
        if (modality === PT) {
            newRange = this.getPTScaledNewRange({
                deltaPointsCanvas: deltaPoints.canvas,
                lower,
                upper,
                clientHeight: element.clientHeight,
                isPreScaled,
                viewport,
                volumeId,
            });
        }
        else {
            newRange = this.getNewRange({
                viewport,
                deltaPointsCanvas: deltaPoints.canvas,
                volumeId,
                lower,
                upper,
            });
        }
        if (viewport instanceof StackViewport) {
            viewport.setProperties({
                voiRange: newRange,
            });
            viewport.render();
            return;
        }
        if (viewport instanceof VolumeViewport) {
            viewport.setProperties({
                voiRange: newRange,
            });
            viewportsContainingVolumeUID.forEach((vp) => {
                vp.render();
            });
            return;
        }
    }
    getPTScaledNewRange({ deltaPointsCanvas, lower, upper, clientHeight, viewport, volumeId, isPreScaled, }) {
        let multiplier = DEFAULT_MULTIPLIER;
        if (isPreScaled) {
            multiplier = 5 / clientHeight;
        }
        else {
            multiplier =
                this._getMultiplierFromDynamicRange(viewport, volumeId) ||
                    DEFAULT_MULTIPLIER;
        }
        const deltaY = deltaPointsCanvas[1];
        const wcDelta = deltaY * multiplier;
        upper -= wcDelta;
        upper = isPreScaled ? Math.max(upper, 0.1) : upper;
        return { lower, upper };
    }
    getNewRange({ viewport, deltaPointsCanvas, volumeId, lower, upper }) {
        const multiplier = this._getMultiplierFromDynamicRange(viewport, volumeId) ||
            DEFAULT_MULTIPLIER;
        const wwDelta = deltaPointsCanvas[0] * multiplier;
        const wcDelta = deltaPointsCanvas[1] * multiplier;
        let { windowWidth, windowCenter } = utilities.windowLevel.toWindowLevel(lower, upper);
        windowWidth += wwDelta;
        windowCenter += wcDelta;
        windowWidth = Math.max(windowWidth, 1);
        return utilities.windowLevel.toLowHighRange(windowWidth, windowCenter);
    }
    _getMultiplierFromDynamicRange(viewport, volumeId) {
        let imageDynamicRange;
        if (volumeId) {
            const imageVolume = cache.getVolume(volumeId);
            const { dimensions } = imageVolume;
            const scalarData = imageVolume.getScalarData();
            const calculatedDynamicRange = this._getImageDynamicRangeFromMiddleSlice(scalarData, dimensions);
            const BitsStored = imageVolume?.metadata?.BitsStored;
            const metadataDynamicRange = BitsStored ? 2 ** BitsStored : Infinity;
            imageDynamicRange = Math.min(calculatedDynamicRange, metadataDynamicRange);
        }
        else {
            imageDynamicRange = this._getImageDynamicRangeFromViewport(viewport);
        }
        const ratio = imageDynamicRange / DEFAULT_IMAGE_DYNAMIC_RANGE;
        let multiplier = DEFAULT_MULTIPLIER;
        if (ratio > 1) {
            multiplier = Math.round(ratio);
        }
        return multiplier;
    }
    _getImageDynamicRangeFromViewport(viewport) {
        const { imageData } = viewport.getImageData();
        const dimensions = imageData.getDimensions();
        let scalarData;
        if (imageData.getScalarData) {
            scalarData = imageData.getScalarData();
        }
        else {
            scalarData = imageData.getPointData().getScalars();
        }
        if (dimensions[2] !== 1) {
            return this._getImageDynamicRangeFromMiddleSlice(scalarData, dimensions);
        }
        let range;
        if (scalarData.getRange) {
            range = scalarData.getRange();
        }
        else {
            const { min, max } = this._getMinMax(scalarData, scalarData.length);
            range = [min, max];
        }
        return range[1] - range[0];
    }
    _getMinMax(frame, frameLength) {
        let min = Infinity;
        let max = -Infinity;
        for (let i = 0; i < frameLength; i++) {
            const voxel = frame[i];
            if (voxel < min) {
                min = voxel;
            }
            if (voxel > max) {
                max = voxel;
            }
        }
        return { max, min };
    }
}
WindowLevelTool.toolName = 'WindowLevel';
export default WindowLevelTool;
//# sourceMappingURL=WindowLevelTool.js.map