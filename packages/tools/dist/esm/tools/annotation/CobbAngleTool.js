import { vec3 } from 'gl-matrix';
import { Events } from '../../enums';
import { getEnabledElement, triggerEvent, eventTarget, } from '@cornerstonejs/core';
import { AnnotationTool } from '../base';
import throttle from '../../utilities/throttle';
import { addAnnotation, getAnnotations, removeAnnotation, } from '../../stateManagement/annotation/annotationState';
import { isAnnotationLocked } from '../../stateManagement/annotation/annotationLocking';
import * as lineSegment from '../../utilities/math/line';
import angleBetweenLines from '../../utilities/math/angle/angleBetweenLines';
import { midPoint2 } from '../../utilities/math/midPoint';
import { drawHandles as drawHandlesSvg, drawLine as drawLineSvg, drawLinkedTextBox as drawLinkedTextBoxSvg, } from '../../drawingSvg';
import { state } from '../../store';
import { getViewportIdsWithToolToRender } from '../../utilities/viewportFilters';
import { getTextBoxCoordsCanvas } from '../../utilities/drawing';
import triggerAnnotationRenderForViewportIds from '../../utilities/triggerAnnotationRenderForViewportIds';
import { resetElementCursor, hideElementCursor, } from '../../cursors/elementCursor';
class CobbAngleTool extends AnnotationTool {
    constructor(toolProps = {}, defaultToolProps = {
        supportedInteractionTypes: ['Mouse', 'Touch'],
        configuration: {
            shadow: true,
            preventHandleOutsideImage: false,
        },
    }) {
        super(toolProps, defaultToolProps);
        this.addNewAnnotation = (evt) => {
            if (this.angleStartedNotYetCompleted) {
                return;
            }
            this.angleStartedNotYetCompleted = true;
            const eventDetail = evt.detail;
            const { currentPoints, element } = eventDetail;
            const worldPos = currentPoints.world;
            const enabledElement = getEnabledElement(element);
            const { viewport, renderingEngine } = enabledElement;
            hideElementCursor(element);
            this.isDrawing = true;
            const camera = viewport.getCamera();
            const { viewPlaneNormal, viewUp } = camera;
            const referencedImageId = this.getReferencedImageId(viewport, worldPos, viewPlaneNormal, viewUp);
            const FrameOfReferenceUID = viewport.getFrameOfReferenceUID();
            const annotation = {
                highlighted: true,
                invalidated: true,
                metadata: {
                    toolName: this.getToolName(),
                    viewPlaneNormal: [...viewPlaneNormal],
                    viewUp: [...viewUp],
                    FrameOfReferenceUID,
                    referencedImageId,
                },
                data: {
                    handles: {
                        points: [[...worldPos], [...worldPos]],
                        activeHandleIndex: null,
                        textBox: {
                            hasMoved: false,
                            worldPosition: [0, 0, 0],
                            worldBoundingBox: {
                                topLeft: [0, 0, 0],
                                topRight: [0, 0, 0],
                                bottomLeft: [0, 0, 0],
                                bottomRight: [0, 0, 0],
                            },
                        },
                    },
                    label: '',
                    cachedStats: {},
                },
            };
            addAnnotation(annotation, element);
            const viewportIdsToRender = getViewportIdsWithToolToRender(element, this.getToolName());
            this.editData = {
                annotation,
                viewportIdsToRender,
                handleIndex: 1,
                movingTextBox: false,
                newAnnotation: true,
                hasMoved: false,
            };
            this._activateDraw(element);
            evt.preventDefault();
            triggerAnnotationRenderForViewportIds(renderingEngine, viewportIdsToRender);
            return annotation;
        };
        this.isPointNearTool = (element, annotation, canvasCoords, proximity) => {
            const enabledElement = getEnabledElement(element);
            const { viewport } = enabledElement;
            const { data } = annotation;
            const [point1, point2, point3, point4] = data.handles.points;
            const canvasPoint1 = viewport.worldToCanvas(point1);
            const canvasPoint2 = viewport.worldToCanvas(point2);
            const canvasPoint3 = viewport.worldToCanvas(point3);
            const canvasPoint4 = viewport.worldToCanvas(point4);
            const line1 = {
                start: {
                    x: canvasPoint1[0],
                    y: canvasPoint1[1],
                },
                end: {
                    x: canvasPoint2[0],
                    y: canvasPoint2[1],
                },
            };
            const line2 = {
                start: {
                    x: canvasPoint3[0],
                    y: canvasPoint3[1],
                },
                end: {
                    x: canvasPoint4[0],
                    y: canvasPoint4[1],
                },
            };
            const distanceToPoint = lineSegment.distanceToPoint([line1.start.x, line1.start.y], [line1.end.x, line1.end.y], [canvasCoords[0], canvasCoords[1]]);
            const distanceToPoint2 = lineSegment.distanceToPoint([line2.start.x, line2.start.y], [line2.end.x, line2.end.y], [canvasCoords[0], canvasCoords[1]]);
            if (distanceToPoint <= proximity || distanceToPoint2 <= proximity) {
                return true;
            }
            return false;
        };
        this.toolSelectedCallback = (evt, annotation, interactionType) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            annotation.highlighted = true;
            const viewportIdsToRender = getViewportIdsWithToolToRender(element, this.getToolName());
            this.editData = {
                annotation,
                viewportIdsToRender,
                movingTextBox: false,
            };
            this._activateModify(element);
            hideElementCursor(element);
            const enabledElement = getEnabledElement(element);
            const { renderingEngine } = enabledElement;
            triggerAnnotationRenderForViewportIds(renderingEngine, viewportIdsToRender);
            evt.preventDefault();
        };
        this._mouseUpCallback = (evt) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const { annotation, viewportIdsToRender, newAnnotation, hasMoved } = this.editData;
            const { data } = annotation;
            if (newAnnotation && !hasMoved) {
                return;
            }
            if (this.angleStartedNotYetCompleted && data.handles.points.length < 4) {
                resetElementCursor(element);
                this.editData.handleIndex = data.handles.points.length;
                return;
            }
            this.angleStartedNotYetCompleted = false;
            data.handles.activeHandleIndex = null;
            this._deactivateModify(element);
            this._deactivateDraw(element);
            resetElementCursor(element);
            const enabledElement = getEnabledElement(element);
            const { renderingEngine } = enabledElement;
            if (this.isHandleOutsideImage &&
                this.configuration.preventHandleOutsideImage) {
                removeAnnotation(annotation.annotationUID);
            }
            triggerAnnotationRenderForViewportIds(renderingEngine, viewportIdsToRender);
            if (newAnnotation) {
                const eventType = Events.ANNOTATION_COMPLETED;
                const eventDetail = {
                    annotation,
                };
                triggerEvent(eventTarget, eventType, eventDetail);
            }
            this.editData = null;
            this.isDrawing = false;
        };
        this._mouseDownCallback = (evt) => {
            const { annotation, handleIndex } = this.editData;
            const eventDetail = evt.detail;
            const { element, currentPoints } = eventDetail;
            const worldPos = currentPoints.world;
            const { data } = annotation;
            if (handleIndex === 1) {
                data.handles.points[1] = worldPos;
                this.editData.hasMoved =
                    data.handles.points[1][0] !== data.handles.points[0][0] ||
                        data.handles.points[1][1] !== data.handles.points[0][0];
                return;
            }
            if (handleIndex === 3) {
                data.handles.points[3] = worldPos;
                this.editData.hasMoved =
                    data.handles.points[3][0] !== data.handles.points[2][0] ||
                        data.handles.points[3][1] !== data.handles.points[2][0];
                this.angleStartedNotYetCompleted = false;
                return;
            }
            this.editData.hasMoved = false;
            hideElementCursor(element);
            data.handles.points[2] = data.handles.points[3] = worldPos;
            this.editData.handleIndex = data.handles.points.length - 1;
        };
        this._mouseDragCallback = (evt) => {
            this.isDrawing = true;
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const { annotation, viewportIdsToRender, handleIndex, movingTextBox } = this.editData;
            const { data } = annotation;
            if (movingTextBox) {
                const { deltaPoints } = eventDetail;
                const worldPosDelta = deltaPoints.world;
                const { textBox } = data.handles;
                const { worldPosition } = textBox;
                worldPosition[0] += worldPosDelta[0];
                worldPosition[1] += worldPosDelta[1];
                worldPosition[2] += worldPosDelta[2];
                textBox.hasMoved = true;
            }
            else if (handleIndex === undefined) {
                const { deltaPoints } = eventDetail;
                const worldPosDelta = deltaPoints.world;
                const points = data.handles.points;
                points.forEach((point) => {
                    point[0] += worldPosDelta[0];
                    point[1] += worldPosDelta[1];
                    point[2] += worldPosDelta[2];
                });
                annotation.invalidated = true;
            }
            else {
                const { currentPoints } = eventDetail;
                const worldPos = currentPoints.world;
                data.handles.points[handleIndex] = [...worldPos];
                annotation.invalidated = true;
            }
            this.editData.hasMoved = true;
            const enabledElement = getEnabledElement(element);
            const { renderingEngine } = enabledElement;
            triggerAnnotationRenderForViewportIds(renderingEngine, viewportIdsToRender);
        };
        this.cancel = (element) => {
            if (this.isDrawing) {
                this.isDrawing = false;
                this._deactivateDraw(element);
                this._deactivateModify(element);
                resetElementCursor(element);
                const { annotation, viewportIdsToRender, newAnnotation } = this.editData;
                const { data } = annotation;
                annotation.highlighted = false;
                data.handles.activeHandleIndex = null;
                const enabledElement = getEnabledElement(element);
                const { renderingEngine } = enabledElement;
                triggerAnnotationRenderForViewportIds(renderingEngine, viewportIdsToRender);
                if (newAnnotation) {
                    const eventType = Events.ANNOTATION_COMPLETED;
                    const eventDetail = {
                        annotation,
                    };
                    triggerEvent(eventTarget, eventType, eventDetail);
                }
                this.editData = null;
                this.angleStartedNotYetCompleted = false;
                return annotation.annotationUID;
            }
        };
        this._activateModify = (element) => {
            state.isInteractingWithTool = true;
            element.addEventListener(Events.MOUSE_UP, this._mouseUpCallback);
            element.addEventListener(Events.MOUSE_DRAG, this._mouseDragCallback);
            element.addEventListener(Events.MOUSE_CLICK, this._mouseUpCallback);
        };
        this._deactivateModify = (element) => {
            state.isInteractingWithTool = false;
            element.removeEventListener(Events.MOUSE_UP, this._mouseUpCallback);
            element.removeEventListener(Events.MOUSE_DRAG, this._mouseDragCallback);
            element.removeEventListener(Events.MOUSE_CLICK, this._mouseUpCallback);
        };
        this._activateDraw = (element) => {
            state.isInteractingWithTool = true;
            element.addEventListener(Events.MOUSE_UP, this._mouseUpCallback);
            element.addEventListener(Events.MOUSE_DRAG, this._mouseDragCallback);
            element.addEventListener(Events.MOUSE_MOVE, this._mouseDragCallback);
            element.addEventListener(Events.MOUSE_CLICK, this._mouseUpCallback);
            element.addEventListener(Events.MOUSE_DOWN, this._mouseDownCallback);
        };
        this._deactivateDraw = (element) => {
            state.isInteractingWithTool = false;
            element.removeEventListener(Events.MOUSE_UP, this._mouseUpCallback);
            element.removeEventListener(Events.MOUSE_DRAG, this._mouseDragCallback);
            element.removeEventListener(Events.MOUSE_MOVE, this._mouseDragCallback);
            element.removeEventListener(Events.MOUSE_CLICK, this._mouseUpCallback);
            element.removeEventListener(Events.MOUSE_DOWN, this._mouseDownCallback);
        };
        this.renderAnnotation = (enabledElement, svgDrawingHelper) => {
            let renderStatus = false;
            const { viewport } = enabledElement;
            const { element } = viewport;
            let annotations = getAnnotations(this.getToolName(), element);
            if (!annotations?.length) {
                return renderStatus;
            }
            annotations = this.filterInteractableAnnotationsForElement(element, annotations);
            if (!annotations?.length) {
                return renderStatus;
            }
            const targetId = this.getTargetId(viewport);
            const renderingEngine = viewport.getRenderingEngine();
            const styleSpecifier = {
                toolGroupId: this.toolGroupId,
                toolName: this.getToolName(),
                viewportId: enabledElement.viewport.id,
            };
            for (let i = 0; i < annotations.length; i++) {
                const annotation = annotations[i];
                const { annotationUID, data } = annotation;
                const { points, activeHandleIndex } = data.handles;
                styleSpecifier.annotationUID = annotationUID;
                const lineWidth = this.getStyle('lineWidth', styleSpecifier, annotation);
                const lineDash = this.getStyle('lineDash', styleSpecifier, annotation);
                const color = this.getStyle('color', styleSpecifier, annotation);
                const canvasCoordinates = points.map((p) => viewport.worldToCanvas(p));
                if (!data.cachedStats[targetId]) {
                    data.cachedStats[targetId] = {
                        angle: null,
                    };
                    this._calculateCachedStats(annotation, renderingEngine, enabledElement);
                }
                else if (annotation.invalidated) {
                    this._throttledCalculateCachedStats(annotation, renderingEngine, enabledElement);
                }
                let activeHandleCanvasCoords;
                if (!isAnnotationLocked(annotation) &&
                    !this.editData &&
                    activeHandleIndex !== null) {
                    activeHandleCanvasCoords = [canvasCoordinates[activeHandleIndex]];
                }
                if (!viewport.getRenderingEngine()) {
                    console.warn('Rendering Engine has been destroyed');
                    return renderStatus;
                }
                if (activeHandleCanvasCoords) {
                    const handleGroupUID = '0';
                    drawHandlesSvg(svgDrawingHelper, annotationUID, handleGroupUID, canvasCoordinates, {
                        color,
                        lineDash,
                        lineWidth,
                    });
                }
                let lineUID = '1';
                drawLineSvg(svgDrawingHelper, annotationUID, lineUID, canvasCoordinates[0], canvasCoordinates[1], {
                    color,
                    width: lineWidth,
                    lineDash,
                });
                renderStatus = true;
                if (canvasCoordinates.length < 4) {
                    return renderStatus;
                }
                lineUID = '2';
                drawLineSvg(svgDrawingHelper, annotationUID, lineUID, canvasCoordinates[2], canvasCoordinates[3], {
                    color,
                    width: lineWidth,
                    lineDash,
                });
                lineUID = '3';
                const mid1 = midPoint2(canvasCoordinates[0], canvasCoordinates[1]);
                const mid2 = midPoint2(canvasCoordinates[2], canvasCoordinates[3]);
                drawLineSvg(svgDrawingHelper, annotationUID, lineUID, mid1, mid2, {
                    color,
                    lineWidth: '1',
                    lineDash: '1,4',
                });
                if (!data.cachedStats[targetId]?.angle) {
                    continue;
                }
                const textLines = this._getTextLines(data, targetId);
                if (!data.handles.textBox.hasMoved) {
                    const canvasTextBoxCoords = getTextBoxCoordsCanvas(canvasCoordinates);
                    data.handles.textBox.worldPosition =
                        viewport.canvasToWorld(canvasTextBoxCoords);
                }
                const textBoxPosition = viewport.worldToCanvas(data.handles.textBox.worldPosition);
                const textBoxUID = '1';
                const boundingBox = drawLinkedTextBoxSvg(svgDrawingHelper, annotationUID, textBoxUID, textLines, textBoxPosition, canvasCoordinates, {}, this.getLinkedTextBoxStyle(styleSpecifier, annotation));
                const { x: left, y: top, width, height } = boundingBox;
                data.handles.textBox.worldBoundingBox = {
                    topLeft: viewport.canvasToWorld([left, top]),
                    topRight: viewport.canvasToWorld([left + width, top]),
                    bottomLeft: viewport.canvasToWorld([left, top + height]),
                    bottomRight: viewport.canvasToWorld([left + width, top + height]),
                };
            }
            return renderStatus;
        };
        this._throttledCalculateCachedStats = throttle(this._calculateCachedStats, 100, { trailing: true });
    }
    handleSelectedCallback(evt, annotation, handle, interactionType = 'mouse') {
        const eventDetail = evt.detail;
        const { element } = eventDetail;
        const { data } = annotation;
        annotation.highlighted = true;
        let movingTextBox = false;
        let handleIndex;
        if (handle.worldPosition) {
            movingTextBox = true;
        }
        else {
            handleIndex = data.handles.points.findIndex((p) => p === handle);
        }
        const viewportIdsToRender = getViewportIdsWithToolToRender(element, this.getToolName());
        this.editData = {
            annotation,
            viewportIdsToRender,
            handleIndex,
            movingTextBox,
        };
        this._activateModify(element);
        hideElementCursor(element);
        const enabledElement = getEnabledElement(element);
        const { renderingEngine } = enabledElement;
        triggerAnnotationRenderForViewportIds(renderingEngine, viewportIdsToRender);
        evt.preventDefault();
    }
    _getTextLines(data, targetId) {
        const cachedVolumeStats = data.cachedStats[targetId];
        const { angle } = cachedVolumeStats;
        if (angle === undefined) {
            return;
        }
        const textLines = [`${angle.toFixed(2)} ${String.fromCharCode(176)}`];
        return textLines;
    }
    _calculateCachedStats(annotation, renderingEngine, enabledElement) {
        const data = annotation.data;
        const { viewportId, renderingEngineId } = enabledElement;
        if (data.handles.points.length !== 4) {
            return;
        }
        const seg1 = [null, null];
        const seg2 = [null, null];
        let minDist = Number.MAX_VALUE;
        for (let i = 0; i < 2; i += 1) {
            for (let j = 2; j < 4; j += 1) {
                const dist = vec3.distance(data.handles.points[i], data.handles.points[j]);
                if (dist < minDist) {
                    minDist = dist;
                    seg1[1] = data.handles.points[i];
                    seg1[0] = data.handles.points[(i + 1) % 2];
                    seg2[0] = data.handles.points[j];
                    seg2[1] = data.handles.points[2 + ((j - 1) % 2)];
                }
            }
        }
        const { cachedStats } = data;
        const targetIds = Object.keys(cachedStats);
        for (let i = 0; i < targetIds.length; i++) {
            const targetId = targetIds[i];
            const angle = angleBetweenLines(seg1, seg2);
            cachedStats[targetId] = {
                angle,
            };
        }
        annotation.invalidated = false;
        const eventType = Events.ANNOTATION_MODIFIED;
        const eventDetail = {
            annotation,
            viewportId,
            renderingEngineId,
        };
        triggerEvent(eventTarget, eventType, eventDetail);
        return cachedStats;
    }
}
CobbAngleTool.toolName = 'CobbAngle';
export default CobbAngleTool;
//# sourceMappingURL=CobbAngleTool.js.map