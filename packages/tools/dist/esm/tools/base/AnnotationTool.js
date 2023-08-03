import { BaseVolumeViewport, StackViewport, cache, getEnabledElement, metaData, } from '@cornerstonejs/core';
import { vec2 } from 'gl-matrix';
import AnnotationDisplayTool from './AnnotationDisplayTool';
import { isAnnotationLocked } from '../../stateManagement/annotation/annotationLocking';
import { isAnnotationVisible } from '../../stateManagement/annotation/annotationVisibility';
class AnnotationTool extends AnnotationDisplayTool {
    constructor() {
        super(...arguments);
        this.mouseMoveCallback = (evt, filteredAnnotations) => {
            if (!filteredAnnotations) {
                return false;
            }
            const { element, currentPoints } = evt.detail;
            const canvasCoords = currentPoints.canvas;
            let annotationsNeedToBeRedrawn = false;
            for (const annotation of filteredAnnotations) {
                if (isAnnotationLocked(annotation) ||
                    !isAnnotationVisible(annotation.annotationUID)) {
                    continue;
                }
                const { data } = annotation;
                const activateHandleIndex = data.handles
                    ? data.handles.activeHandleIndex
                    : undefined;
                const near = this._imagePointNearToolOrHandle(element, annotation, canvasCoords, 6);
                const nearToolAndNotMarkedActive = near && !annotation.highlighted;
                const notNearToolAndMarkedActive = !near && annotation.highlighted;
                if (nearToolAndNotMarkedActive || notNearToolAndMarkedActive) {
                    annotation.highlighted = !annotation.highlighted;
                    annotationsNeedToBeRedrawn = true;
                }
                else if (data.handles &&
                    data.handles.activeHandleIndex !== activateHandleIndex) {
                    annotationsNeedToBeRedrawn = true;
                }
            }
            return annotationsNeedToBeRedrawn;
        };
    }
    getHandleNearImagePoint(element, annotation, canvasCoords, proximity) {
        const enabledElement = getEnabledElement(element);
        const { viewport } = enabledElement;
        const { data } = annotation;
        const { points, textBox } = data.handles;
        const { worldBoundingBox } = textBox;
        if (worldBoundingBox) {
            const canvasBoundingBox = {
                topLeft: viewport.worldToCanvas(worldBoundingBox.topLeft),
                topRight: viewport.worldToCanvas(worldBoundingBox.topRight),
                bottomLeft: viewport.worldToCanvas(worldBoundingBox.bottomLeft),
                bottomRight: viewport.worldToCanvas(worldBoundingBox.bottomRight),
            };
            if (canvasCoords[0] >= canvasBoundingBox.topLeft[0] &&
                canvasCoords[0] <= canvasBoundingBox.bottomRight[0] &&
                canvasCoords[1] >= canvasBoundingBox.topLeft[1] &&
                canvasCoords[1] <= canvasBoundingBox.bottomRight[1]) {
                data.handles.activeHandleIndex = null;
                return textBox;
            }
        }
        for (let i = 0; i < points.length; i++) {
            const point = points[i];
            const annotationCanvasCoordinate = viewport.worldToCanvas(point);
            const near = vec2.distance(canvasCoords, annotationCanvasCoordinate) < proximity;
            if (near === true) {
                data.handles.activeHandleIndex = i;
                return point;
            }
        }
        data.handles.activeHandleIndex = null;
    }
    getLinkedTextBoxStyle(specifications, annotation) {
        return {
            fontFamily: this.getStyle('textBoxFontFamily', specifications, annotation),
            fontSize: this.getStyle('textBoxFontSize', specifications, annotation),
            color: this.getStyle('textBoxColor', specifications, annotation),
            shadow: this.getStyle('textBoxShadow', specifications, annotation),
            background: this.getStyle('textBoxBackground', specifications, annotation),
            lineWidth: this.getStyle('textBoxLinkLineWidth', specifications, annotation),
            lineDash: this.getStyle('textBoxLinkLineDash', specifications, annotation),
        };
    }
    isSuvScaled(viewport, targetId, imageId) {
        if (viewport instanceof BaseVolumeViewport) {
            const volumeId = targetId.split('volumeId:')[1];
            const volume = cache.getVolume(volumeId);
            return volume.scaling?.PT !== undefined;
        }
        else if (viewport instanceof StackViewport) {
            const scalingModule = imageId && metaData.get('scalingModule', imageId);
            return typeof scalingModule?.suvbw === 'number';
        }
        else {
            throw new Error('Viewport is not a valid type');
        }
    }
    _imagePointNearToolOrHandle(element, annotation, canvasCoords, proximity) {
        const handleNearImagePoint = this.getHandleNearImagePoint(element, annotation, canvasCoords, proximity);
        if (handleNearImagePoint) {
            return true;
        }
        const toolNewImagePoint = this.isPointNearTool(element, annotation, canvasCoords, proximity, 'mouse');
        if (toolNewImagePoint) {
            return true;
        }
    }
}
AnnotationTool.toolName = 'AnnotationTool';
export default AnnotationTool;
//# sourceMappingURL=AnnotationTool.js.map