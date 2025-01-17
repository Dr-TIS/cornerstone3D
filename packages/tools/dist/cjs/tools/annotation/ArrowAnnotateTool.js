"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const enums_1 = require("../../enums");
const core_1 = require("@cornerstonejs/core");
const base_1 = require("../base");
const annotationState_1 = require("../../stateManagement/annotation/annotationState");
const annotationLocking_1 = require("../../stateManagement/annotation/annotationLocking");
const lineSegment = __importStar(require("../../utilities/math/line"));
const drawingSvg_1 = require("../../drawingSvg");
const store_1 = require("../../store");
const viewportFilters_1 = require("../../utilities/viewportFilters");
const triggerAnnotationRenderForViewportIds_1 = __importDefault(require("../../utilities/triggerAnnotationRenderForViewportIds"));
const elementCursor_1 = require("../../cursors/elementCursor");
class ArrowAnnotateTool extends base_1.AnnotationTool {
    constructor(toolProps = {}, defaultToolProps = {
        supportedInteractionTypes: ['Mouse', 'Touch'],
        configuration: {
            shadow: true,
            getTextCallback,
            changeTextCallback,
            preventHandleOutsideImage: false,
            arrowFirst: true,
        },
    }) {
        super(toolProps, defaultToolProps);
        this.addNewAnnotation = (evt) => {
            const eventDetail = evt.detail;
            const { currentPoints, element } = eventDetail;
            const worldPos = currentPoints.world;
            const enabledElement = (0, core_1.getEnabledElement)(element);
            const { viewport, renderingEngine } = enabledElement;
            (0, elementCursor_1.hideElementCursor)(element);
            this.isDrawing = true;
            const camera = viewport.getCamera();
            const { viewPlaneNormal, viewUp } = camera;
            const referencedImageId = this.getReferencedImageId(viewport, worldPos, viewPlaneNormal, viewUp);
            const { arrowFirst } = this.configuration;
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
                    text: '',
                    handles: {
                        points: [[...worldPos], [...worldPos]],
                        activeHandleIndex: null,
                        arrowFirst,
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
                },
            };
            (0, annotationState_1.addAnnotation)(annotation, element);
            const viewportIdsToRender = (0, viewportFilters_1.getViewportIdsWithToolToRender)(element, this.getToolName());
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
            (0, triggerAnnotationRenderForViewportIds_1.default)(renderingEngine, viewportIdsToRender);
            return annotation;
        };
        this.isPointNearTool = (element, annotation, canvasCoords, proximity) => {
            const enabledElement = (0, core_1.getEnabledElement)(element);
            const { viewport } = enabledElement;
            const { data } = annotation;
            const [point1, point2] = data.handles.points;
            const canvasPoint1 = viewport.worldToCanvas(point1);
            const canvasPoint2 = viewport.worldToCanvas(point2);
            const line = {
                start: {
                    x: canvasPoint1[0],
                    y: canvasPoint1[1],
                },
                end: {
                    x: canvasPoint2[0],
                    y: canvasPoint2[1],
                },
            };
            const distanceToPoint = lineSegment.distanceToPoint([line.start.x, line.start.y], [line.end.x, line.end.y], [canvasCoords[0], canvasCoords[1]]);
            if (distanceToPoint <= proximity) {
                return true;
            }
            return false;
        };
        this.toolSelectedCallback = (evt, annotation) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            annotation.highlighted = true;
            const viewportIdsToRender = (0, viewportFilters_1.getViewportIdsWithToolToRender)(element, this.getToolName());
            this.editData = {
                annotation,
                viewportIdsToRender,
                movingTextBox: false,
            };
            this._activateModify(element);
            (0, elementCursor_1.hideElementCursor)(element);
            const enabledElement = (0, core_1.getEnabledElement)(element);
            const { renderingEngine } = enabledElement;
            (0, triggerAnnotationRenderForViewportIds_1.default)(renderingEngine, viewportIdsToRender);
            evt.preventDefault();
        };
        this._endCallback = (evt) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const { annotation, viewportIdsToRender, newAnnotation, hasMoved } = this.editData;
            const { data } = annotation;
            if (newAnnotation && !hasMoved) {
                return;
            }
            data.handles.activeHandleIndex = null;
            this._deactivateModify(element);
            this._deactivateDraw(element);
            (0, elementCursor_1.resetElementCursor)(element);
            const enabledElement = (0, core_1.getEnabledElement)(element);
            const { viewportId, renderingEngineId, renderingEngine } = enabledElement;
            if (this.isHandleOutsideImage &&
                this.configuration.preventHandleOutsideImage) {
                (0, annotationState_1.removeAnnotation)(annotation.annotationUID);
            }
            if (newAnnotation) {
                this.configuration.getTextCallback((text) => {
                    if (!text) {
                        (0, annotationState_1.removeAnnotation)(annotation.annotationUID);
                        (0, triggerAnnotationRenderForViewportIds_1.default)(renderingEngine, viewportIdsToRender);
                        this.editData = null;
                        this.isDrawing = false;
                        return;
                    }
                    annotation.data.text = text;
                    const eventType = enums_1.Events.ANNOTATION_COMPLETED;
                    const eventDetail = {
                        annotation,
                    };
                    (0, core_1.triggerEvent)(core_1.eventTarget, eventType, eventDetail);
                    (0, triggerAnnotationRenderForViewportIds_1.default)(renderingEngine, viewportIdsToRender);
                });
            }
            else {
                const eventType = enums_1.Events.ANNOTATION_MODIFIED;
                const eventDetail = {
                    annotation,
                    viewportId,
                    renderingEngineId,
                };
                (0, core_1.triggerEvent)(core_1.eventTarget, eventType, eventDetail);
            }
            this.editData = null;
            this.isDrawing = false;
        };
        this._dragCallback = (evt) => {
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
            const enabledElement = (0, core_1.getEnabledElement)(element);
            const { renderingEngine } = enabledElement;
            (0, triggerAnnotationRenderForViewportIds_1.default)(renderingEngine, viewportIdsToRender);
        };
        this.touchTapCallback = (evt) => {
            if (evt.detail.taps == 2) {
                this.doubleClickCallback(evt);
            }
        };
        this.doubleClickCallback = (evt) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            let annotations = (0, annotationState_1.getAnnotations)(this.getToolName(), element);
            annotations = this.filterInteractableAnnotationsForElement(element, annotations);
            if (!(annotations === null || annotations === void 0 ? void 0 : annotations.length)) {
                return;
            }
            const clickedAnnotation = annotations.find((annotation) => this.isPointNearTool(element, annotation, eventDetail.currentPoints.canvas, 6));
            if (!clickedAnnotation) {
                return;
            }
            const annotation = clickedAnnotation;
            this.configuration.changeTextCallback(clickedAnnotation, evt.detail, this._doneChangingTextCallback.bind(this, element, annotation));
            this.editData = null;
            this.isDrawing = false;
            evt.stopImmediatePropagation();
            evt.preventDefault();
        };
        this.cancel = (element) => {
            if (this.isDrawing) {
                this.isDrawing = false;
                this._deactivateDraw(element);
                this._deactivateModify(element);
                (0, elementCursor_1.resetElementCursor)(element);
                const { annotation, viewportIdsToRender, newAnnotation } = this.editData;
                const { data } = annotation;
                annotation.highlighted = false;
                data.handles.activeHandleIndex = null;
                const enabledElement = (0, core_1.getEnabledElement)(element);
                const { renderingEngine } = enabledElement;
                (0, triggerAnnotationRenderForViewportIds_1.default)(renderingEngine, viewportIdsToRender);
                if (newAnnotation) {
                    const eventType = enums_1.Events.ANNOTATION_COMPLETED;
                    const eventDetail = {
                        annotation,
                    };
                    (0, core_1.triggerEvent)(core_1.eventTarget, eventType, eventDetail);
                }
                this.editData = null;
                return annotation.annotationUID;
            }
        };
        this._activateModify = (element) => {
            store_1.state.isInteractingWithTool = true;
            element.addEventListener(enums_1.Events.MOUSE_UP, this._endCallback);
            element.addEventListener(enums_1.Events.MOUSE_DRAG, this._dragCallback);
            element.addEventListener(enums_1.Events.MOUSE_CLICK, this._endCallback);
            element.addEventListener(enums_1.Events.TOUCH_TAP, this._endCallback);
            element.addEventListener(enums_1.Events.TOUCH_END, this._endCallback);
            element.addEventListener(enums_1.Events.TOUCH_DRAG, this._dragCallback);
        };
        this._deactivateModify = (element) => {
            store_1.state.isInteractingWithTool = false;
            element.removeEventListener(enums_1.Events.MOUSE_UP, this._endCallback);
            element.removeEventListener(enums_1.Events.MOUSE_DRAG, this._dragCallback);
            element.removeEventListener(enums_1.Events.MOUSE_CLICK, this._endCallback);
            element.removeEventListener(enums_1.Events.TOUCH_TAP, this._endCallback);
            element.removeEventListener(enums_1.Events.TOUCH_DRAG, this._dragCallback);
            element.removeEventListener(enums_1.Events.TOUCH_END, this._endCallback);
        };
        this._activateDraw = (element) => {
            store_1.state.isInteractingWithTool = true;
            element.addEventListener(enums_1.Events.MOUSE_UP, this._endCallback);
            element.addEventListener(enums_1.Events.MOUSE_DRAG, this._dragCallback);
            element.addEventListener(enums_1.Events.MOUSE_MOVE, this._dragCallback);
            element.addEventListener(enums_1.Events.MOUSE_CLICK, this._endCallback);
            element.addEventListener(enums_1.Events.TOUCH_TAP, this._endCallback);
            element.addEventListener(enums_1.Events.TOUCH_END, this._endCallback);
            element.addEventListener(enums_1.Events.TOUCH_DRAG, this._dragCallback);
        };
        this._deactivateDraw = (element) => {
            store_1.state.isInteractingWithTool = false;
            element.removeEventListener(enums_1.Events.MOUSE_UP, this._endCallback);
            element.removeEventListener(enums_1.Events.MOUSE_DRAG, this._dragCallback);
            element.removeEventListener(enums_1.Events.MOUSE_MOVE, this._dragCallback);
            element.removeEventListener(enums_1.Events.MOUSE_CLICK, this._endCallback);
            element.removeEventListener(enums_1.Events.TOUCH_TAP, this._endCallback);
            element.removeEventListener(enums_1.Events.TOUCH_END, this._endCallback);
            element.removeEventListener(enums_1.Events.TOUCH_DRAG, this._dragCallback);
        };
        this.renderAnnotation = (enabledElement, svgDrawingHelper) => {
            let renderStatus = false;
            const { viewport } = enabledElement;
            const { element } = viewport;
            let annotations = (0, annotationState_1.getAnnotations)(this.getToolName(), element);
            if (!(annotations === null || annotations === void 0 ? void 0 : annotations.length)) {
                return renderStatus;
            }
            annotations = this.filterInteractableAnnotationsForElement(element, annotations);
            if (!(annotations === null || annotations === void 0 ? void 0 : annotations.length)) {
                return renderStatus;
            }
            const styleSpecifier = {
                toolGroupId: this.toolGroupId,
                toolName: this.getToolName(),
                viewportId: enabledElement.viewport.id,
            };
            for (let i = 0; i < annotations.length; i++) {
                const annotation = annotations[i];
                const { annotationUID, data } = annotation;
                const { handles, text } = data;
                const { points, activeHandleIndex } = handles;
                styleSpecifier.annotationUID = annotationUID;
                const lineWidth = this.getStyle('lineWidth', styleSpecifier, annotation);
                const lineDash = this.getStyle('lineDash', styleSpecifier, annotation);
                const color = this.getStyle('color', styleSpecifier, annotation);
                const canvasCoordinates = points.map((p) => viewport.worldToCanvas(p));
                let activeHandleCanvasCoords;
                if (!(0, annotationLocking_1.isAnnotationLocked)(annotation) &&
                    !this.editData &&
                    activeHandleIndex !== null) {
                    activeHandleCanvasCoords = [canvasCoordinates[activeHandleIndex]];
                }
                if (activeHandleCanvasCoords) {
                    const handleGroupUID = '0';
                    (0, drawingSvg_1.drawHandles)(svgDrawingHelper, annotationUID, handleGroupUID, canvasCoordinates, {
                        color,
                        lineWidth,
                    });
                }
                const arrowUID = '1';
                if (this.configuration.arrowFirst) {
                    (0, drawingSvg_1.drawArrow)(svgDrawingHelper, annotationUID, arrowUID, canvasCoordinates[1], canvasCoordinates[0], {
                        color,
                        width: lineWidth,
                        lineDash: lineDash,
                    });
                }
                else {
                    (0, drawingSvg_1.drawArrow)(svgDrawingHelper, annotationUID, arrowUID, canvasCoordinates[0], canvasCoordinates[1], {
                        color,
                        width: lineWidth,
                        lineDash: lineDash,
                    });
                }
                renderStatus = true;
                if (!viewport.getRenderingEngine()) {
                    console.warn('Rendering Engine has been destroyed');
                    return renderStatus;
                }
                if (!text) {
                    continue;
                }
                if (!data.handles.textBox.hasMoved) {
                    const canvasTextBoxCoords = canvasCoordinates[1];
                    data.handles.textBox.worldPosition =
                        viewport.canvasToWorld(canvasTextBoxCoords);
                }
                const textBoxPosition = viewport.worldToCanvas(data.handles.textBox.worldPosition);
                const textBoxUID = '1';
                const boundingBox = (0, drawingSvg_1.drawLinkedTextBox)(svgDrawingHelper, annotationUID, textBoxUID, [text], textBoxPosition, canvasCoordinates, {}, this.getLinkedTextBoxStyle(styleSpecifier, annotation));
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
    }
    handleSelectedCallback(evt, annotation, handle) {
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
        const viewportIdsToRender = (0, viewportFilters_1.getViewportIdsWithToolToRender)(element, this.getToolName());
        this.editData = {
            annotation,
            viewportIdsToRender,
            handleIndex,
            movingTextBox,
        };
        this._activateModify(element);
        (0, elementCursor_1.hideElementCursor)(element);
        const enabledElement = (0, core_1.getEnabledElement)(element);
        const { renderingEngine } = enabledElement;
        (0, triggerAnnotationRenderForViewportIds_1.default)(renderingEngine, viewportIdsToRender);
        evt.preventDefault();
    }
    _doneChangingTextCallback(element, annotation, updatedText) {
        annotation.data.text = updatedText;
        const { renderingEngine, viewportId, renderingEngineId } = (0, core_1.getEnabledElement)(element);
        const viewportIdsToRender = (0, viewportFilters_1.getViewportIdsWithToolToRender)(element, this.getToolName());
        (0, triggerAnnotationRenderForViewportIds_1.default)(renderingEngine, viewportIdsToRender);
        const eventType = enums_1.Events.ANNOTATION_MODIFIED;
        (0, core_1.triggerEvent)(core_1.eventTarget, eventType, {
            annotation,
            viewportId,
            renderingEngineId,
        });
    }
    _isInsideVolume(index1, index2, dimensions) {
        return (core_1.utilities.indexWithinDimensions(index1, dimensions) &&
            core_1.utilities.indexWithinDimensions(index2, dimensions));
    }
}
function getTextCallback(doneChangingTextCallback) {
    return doneChangingTextCallback(prompt('Enter your annotation:'));
}
function changeTextCallback(data, eventData, doneChangingTextCallback) {
    return doneChangingTextCallback(prompt('Enter your annotation:'));
}
ArrowAnnotateTool.toolName = 'ArrowAnnotate';
exports.default = ArrowAnnotateTool;
//# sourceMappingURL=ArrowAnnotateTool.js.map