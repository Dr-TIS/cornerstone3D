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
const gl_matrix_1 = require("gl-matrix");
const core_1 = require("@cornerstonejs/core");
const getCalibratedUnits_1 = require("../../utilities/getCalibratedUnits");
const roundNumber_1 = __importDefault(require("../../utilities/roundNumber"));
const base_1 = require("../base");
const throttle_1 = __importDefault(require("../../utilities/throttle"));
const annotationState_1 = require("../../stateManagement/annotation/annotationState");
const annotationLocking_1 = require("../../stateManagement/annotation/annotationLocking");
const annotationVisibility_1 = require("../../stateManagement/annotation/annotationVisibility");
const drawingSvg_1 = require("../../drawingSvg");
const store_1 = require("../../store");
const enums_1 = require("../../enums");
const viewportFilters_1 = require("../../utilities/viewportFilters");
const lineSegment = __importStar(require("../../utilities/math/line"));
const drawing_1 = require("../../utilities/drawing");
const elementCursor_1 = require("../../cursors/elementCursor");
const triggerAnnotationRenderForViewportIds_1 = __importDefault(require("../../utilities/triggerAnnotationRenderForViewportIds"));
const { transformWorldToIndex } = core_1.utilities;
class BidirectionalTool extends base_1.AnnotationTool {
    constructor(toolProps = {}, defaultToolProps = {
        supportedInteractionTypes: ['Mouse', 'Touch'],
        configuration: {
            preventHandleOutsideImage: false,
        },
    }) {
        super(toolProps, defaultToolProps);
        this.isPointNearTool = (element, annotation, canvasCoords, proximity) => {
            const enabledElement = (0, core_1.getEnabledElement)(element);
            const { viewport } = enabledElement;
            const { data } = annotation;
            const { points } = data.handles;
            let canvasPoint1 = viewport.worldToCanvas(points[0]);
            let canvasPoint2 = viewport.worldToCanvas(points[1]);
            let line = {
                start: {
                    x: canvasPoint1[0],
                    y: canvasPoint1[1],
                },
                end: {
                    x: canvasPoint2[0],
                    y: canvasPoint2[1],
                },
            };
            let distanceToPoint = lineSegment.distanceToPoint([line.start.x, line.start.y], [line.end.x, line.end.y], [canvasCoords[0], canvasCoords[1]]);
            if (distanceToPoint <= proximity) {
                return true;
            }
            canvasPoint1 = viewport.worldToCanvas(points[2]);
            canvasPoint2 = viewport.worldToCanvas(points[3]);
            line = {
                start: {
                    x: canvasPoint1[0],
                    y: canvasPoint1[1],
                },
                end: {
                    x: canvasPoint2[0],
                    y: canvasPoint2[1],
                },
            };
            distanceToPoint = lineSegment.distanceToPoint([line.start.x, line.start.y], [line.end.x, line.end.y], [canvasCoords[0], canvasCoords[1]]);
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
            const enabledElement = (0, core_1.getEnabledElement)(element);
            const { renderingEngine } = enabledElement;
            (0, triggerAnnotationRenderForViewportIds_1.default)(renderingEngine, viewportIdsToRender);
            (0, elementCursor_1.hideElementCursor)(element);
            evt.preventDefault();
        };
        this.handleSelectedCallback = (evt, annotation, handle) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const data = annotation.data;
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
            (0, elementCursor_1.hideElementCursor)(element);
            this.editData = {
                annotation,
                viewportIdsToRender,
                handleIndex,
                movingTextBox,
            };
            this._activateModify(element);
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
            const { renderingEngine } = enabledElement;
            if (this.editData.handleIndex !== undefined) {
                const { points } = data.handles;
                const firstLineSegmentLength = gl_matrix_1.vec3.distance(points[0], points[1]);
                const secondLineSegmentLength = gl_matrix_1.vec3.distance(points[2], points[3]);
                if (secondLineSegmentLength > firstLineSegmentLength) {
                    const longAxis = [[...points[2]], [...points[3]]];
                    const shortAxisPoint0 = [...points[0]];
                    const shortAxisPoint1 = [...points[1]];
                    const longAxisVector = gl_matrix_1.vec2.create();
                    gl_matrix_1.vec2.set(longAxisVector, longAxis[1][0] - longAxis[0][0], longAxis[1][1] - longAxis[1][0]);
                    const counterClockWisePerpendicularToLongAxis = gl_matrix_1.vec2.create();
                    gl_matrix_1.vec2.set(counterClockWisePerpendicularToLongAxis, -longAxisVector[1], longAxisVector[0]);
                    const currentShortAxisVector = gl_matrix_1.vec2.create();
                    gl_matrix_1.vec2.set(currentShortAxisVector, shortAxisPoint1[0] - shortAxisPoint0[0], shortAxisPoint1[1] - shortAxisPoint0[0]);
                    let shortAxis;
                    if (gl_matrix_1.vec2.dot(currentShortAxisVector, counterClockWisePerpendicularToLongAxis) > 0) {
                        shortAxis = [shortAxisPoint0, shortAxisPoint1];
                    }
                    else {
                        shortAxis = [shortAxisPoint1, shortAxisPoint0];
                    }
                    data.handles.points = [
                        longAxis[0],
                        longAxis[1],
                        shortAxis[0],
                        shortAxis[1],
                    ];
                }
            }
            if (this.isHandleOutsideImage &&
                this.configuration.preventHandleOutsideImage) {
                (0, annotationState_1.removeAnnotation)(annotation.annotationUID);
            }
            (0, triggerAnnotationRenderForViewportIds_1.default)(renderingEngine, viewportIdsToRender);
            if (newAnnotation) {
                const eventType = enums_1.Events.ANNOTATION_COMPLETED;
                const eventDetail = {
                    annotation,
                };
                (0, core_1.triggerEvent)(core_1.eventTarget, eventType, eventDetail);
            }
            this.editData = null;
            this.isDrawing = false;
        };
        this._dragDrawCallback = (evt) => {
            this.isDrawing = true;
            const eventDetail = evt.detail;
            const { currentPoints, element } = eventDetail;
            const enabledElement = (0, core_1.getEnabledElement)(element);
            const { renderingEngine, viewport } = enabledElement;
            const { worldToCanvas } = viewport;
            const { annotation, viewportIdsToRender, handleIndex } = this.editData;
            const { data } = annotation;
            const worldPos = currentPoints.world;
            data.handles.points[handleIndex] = [...worldPos];
            const canvasCoordPoints = data.handles.points.map(worldToCanvas);
            const canvasCoords = {
                longLineSegment: {
                    start: {
                        x: canvasCoordPoints[0][0],
                        y: canvasCoordPoints[0][1],
                    },
                    end: {
                        x: canvasCoordPoints[1][0],
                        y: canvasCoordPoints[1][1],
                    },
                },
                shortLineSegment: {
                    start: {
                        x: canvasCoordPoints[2][0],
                        y: canvasCoordPoints[2][1],
                    },
                    end: {
                        x: canvasCoordPoints[3][0],
                        y: canvasCoordPoints[3][1],
                    },
                },
            };
            const dist = gl_matrix_1.vec2.distance(canvasCoordPoints[0], canvasCoordPoints[1]);
            const shortAxisDistFromCenter = dist / 3;
            const dx = canvasCoords.longLineSegment.start.x - canvasCoords.longLineSegment.end.x;
            const dy = canvasCoords.longLineSegment.start.y - canvasCoords.longLineSegment.end.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const vectorX = dx / length;
            const vectorY = dy / length;
            const xMid = (canvasCoords.longLineSegment.start.x +
                canvasCoords.longLineSegment.end.x) /
                2;
            const yMid = (canvasCoords.longLineSegment.start.y +
                canvasCoords.longLineSegment.end.y) /
                2;
            const startX = xMid + shortAxisDistFromCenter * vectorY;
            const startY = yMid - shortAxisDistFromCenter * vectorX;
            const endX = xMid - shortAxisDistFromCenter * vectorY;
            const endY = yMid + shortAxisDistFromCenter * vectorX;
            data.handles.points[2] = viewport.canvasToWorld([startX, startY]);
            data.handles.points[3] = viewport.canvasToWorld([endX, endY]);
            annotation.invalidated = true;
            (0, triggerAnnotationRenderForViewportIds_1.default)(renderingEngine, viewportIdsToRender);
            this.editData.hasMoved = true;
        };
        this._dragModifyCallback = (evt) => {
            this.isDrawing = true;
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const enabledElement = (0, core_1.getEnabledElement)(element);
            const { renderingEngine } = enabledElement;
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
                this._dragModifyHandle(evt);
                annotation.invalidated = true;
            }
            (0, triggerAnnotationRenderForViewportIds_1.default)(renderingEngine, viewportIdsToRender);
        };
        this._dragModifyHandle = (evt) => {
            const eventDetail = evt.detail;
            const { currentPoints, element } = eventDetail;
            const enabledElement = (0, core_1.getEnabledElement)(element);
            const { viewport } = enabledElement;
            const { annotation, handleIndex: movingHandleIndex } = this.editData;
            const { data } = annotation;
            const worldPos = currentPoints.world;
            const canvasCoordHandlesCurrent = [
                viewport.worldToCanvas(data.handles.points[0]),
                viewport.worldToCanvas(data.handles.points[1]),
                viewport.worldToCanvas(data.handles.points[2]),
                viewport.worldToCanvas(data.handles.points[3]),
            ];
            const firstLineSegment = {
                start: {
                    x: canvasCoordHandlesCurrent[0][0],
                    y: canvasCoordHandlesCurrent[0][1],
                },
                end: {
                    x: canvasCoordHandlesCurrent[1][0],
                    y: canvasCoordHandlesCurrent[1][1],
                },
            };
            const secondLineSegment = {
                start: {
                    x: canvasCoordHandlesCurrent[2][0],
                    y: canvasCoordHandlesCurrent[2][1],
                },
                end: {
                    x: canvasCoordHandlesCurrent[3][0],
                    y: canvasCoordHandlesCurrent[3][1],
                },
            };
            const proposedPoint = [...worldPos];
            const proposedCanvasCoord = viewport.worldToCanvas(proposedPoint);
            if (movingHandleIndex === 0 || movingHandleIndex === 1) {
                const fixedHandleIndex = movingHandleIndex === 0 ? 1 : 0;
                const fixedHandleCanvasCoord = canvasCoordHandlesCurrent[fixedHandleIndex];
                const fixedHandleToProposedCoordVec = gl_matrix_1.vec2.set(gl_matrix_1.vec2.create(), proposedCanvasCoord[0] - fixedHandleCanvasCoord[0], proposedCanvasCoord[1] - fixedHandleCanvasCoord[1]);
                const fixedHandleToOldCoordVec = gl_matrix_1.vec2.set(gl_matrix_1.vec2.create(), canvasCoordHandlesCurrent[movingHandleIndex][0] -
                    fixedHandleCanvasCoord[0], canvasCoordHandlesCurrent[movingHandleIndex][1] -
                    fixedHandleCanvasCoord[1]);
                gl_matrix_1.vec2.normalize(fixedHandleToProposedCoordVec, fixedHandleToProposedCoordVec);
                gl_matrix_1.vec2.normalize(fixedHandleToOldCoordVec, fixedHandleToOldCoordVec);
                const proposedFirstLineSegment = {
                    start: {
                        x: fixedHandleCanvasCoord[0],
                        y: fixedHandleCanvasCoord[1],
                    },
                    end: {
                        x: proposedCanvasCoord[0],
                        y: proposedCanvasCoord[1],
                    },
                };
                if (this._movingLongAxisWouldPutItThroughShortAxis(proposedFirstLineSegment, secondLineSegment)) {
                    return;
                }
                const centerOfRotation = fixedHandleCanvasCoord;
                const angle = this._getSignedAngle(fixedHandleToOldCoordVec, fixedHandleToProposedCoordVec);
                let firstPointX = canvasCoordHandlesCurrent[2][0];
                let firstPointY = canvasCoordHandlesCurrent[2][1];
                let secondPointX = canvasCoordHandlesCurrent[3][0];
                let secondPointY = canvasCoordHandlesCurrent[3][1];
                firstPointX -= centerOfRotation[0];
                firstPointY -= centerOfRotation[1];
                secondPointX -= centerOfRotation[0];
                secondPointY -= centerOfRotation[1];
                const rotatedFirstPoint = firstPointX * Math.cos(angle) - firstPointY * Math.sin(angle);
                const rotatedFirstPointY = firstPointX * Math.sin(angle) + firstPointY * Math.cos(angle);
                const rotatedSecondPoint = secondPointX * Math.cos(angle) - secondPointY * Math.sin(angle);
                const rotatedSecondPointY = secondPointX * Math.sin(angle) + secondPointY * Math.cos(angle);
                firstPointX = rotatedFirstPoint + centerOfRotation[0];
                firstPointY = rotatedFirstPointY + centerOfRotation[1];
                secondPointX = rotatedSecondPoint + centerOfRotation[0];
                secondPointY = rotatedSecondPointY + centerOfRotation[1];
                const newFirstPoint = viewport.canvasToWorld([firstPointX, firstPointY]);
                const newSecondPoint = viewport.canvasToWorld([
                    secondPointX,
                    secondPointY,
                ]);
                data.handles.points[movingHandleIndex] = proposedPoint;
                data.handles.points[2] = newFirstPoint;
                data.handles.points[3] = newSecondPoint;
            }
            else {
                const translateHandleIndex = movingHandleIndex === 2 ? 3 : 2;
                const canvasCoordsCurrent = {
                    longLineSegment: {
                        start: firstLineSegment.start,
                        end: firstLineSegment.end,
                    },
                    shortLineSegment: {
                        start: secondLineSegment.start,
                        end: secondLineSegment.end,
                    },
                };
                const longLineSegmentVec = gl_matrix_1.vec2.subtract(gl_matrix_1.vec2.create(), [
                    canvasCoordsCurrent.longLineSegment.end.x,
                    canvasCoordsCurrent.longLineSegment.end.y,
                ], [
                    canvasCoordsCurrent.longLineSegment.start.x,
                    canvasCoordsCurrent.longLineSegment.start.y,
                ]);
                const longLineSegmentVecNormalized = gl_matrix_1.vec2.normalize(gl_matrix_1.vec2.create(), longLineSegmentVec);
                const proposedToCurrentVec = gl_matrix_1.vec2.subtract(gl_matrix_1.vec2.create(), [proposedCanvasCoord[0], proposedCanvasCoord[1]], [
                    canvasCoordHandlesCurrent[movingHandleIndex][0],
                    canvasCoordHandlesCurrent[movingHandleIndex][1],
                ]);
                const movementLength = gl_matrix_1.vec2.length(proposedToCurrentVec);
                const angle = this._getSignedAngle(longLineSegmentVecNormalized, proposedToCurrentVec);
                const movementAlongLineSegmentLength = Math.cos(angle) * movementLength;
                const newTranslatedPoint = gl_matrix_1.vec2.scaleAndAdd(gl_matrix_1.vec2.create(), [
                    canvasCoordHandlesCurrent[translateHandleIndex][0],
                    canvasCoordHandlesCurrent[translateHandleIndex][1],
                ], longLineSegmentVecNormalized, movementAlongLineSegmentLength);
                if (this._movingLongAxisWouldPutItThroughShortAxis({
                    start: {
                        x: proposedCanvasCoord[0],
                        y: proposedCanvasCoord[1],
                    },
                    end: {
                        x: newTranslatedPoint[0],
                        y: newTranslatedPoint[1],
                    },
                }, {
                    start: {
                        x: canvasCoordsCurrent.longLineSegment.start.x,
                        y: canvasCoordsCurrent.longLineSegment.start.y,
                    },
                    end: {
                        x: canvasCoordsCurrent.longLineSegment.end.x,
                        y: canvasCoordsCurrent.longLineSegment.end.y,
                    },
                })) {
                    return;
                }
                const intersectionPoint = lineSegment.intersectLine([proposedCanvasCoord[0], proposedCanvasCoord[1]], [newTranslatedPoint[0], newTranslatedPoint[1]], [firstLineSegment.start.x, firstLineSegment.start.y], [firstLineSegment.end.x, firstLineSegment.end.y]);
                if (!intersectionPoint) {
                    return;
                }
                data.handles.points[translateHandleIndex] = viewport.canvasToWorld(newTranslatedPoint);
                data.handles.points[movingHandleIndex] = proposedPoint;
            }
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
        this._activateDraw = (element) => {
            store_1.state.isInteractingWithTool = true;
            element.addEventListener(enums_1.Events.MOUSE_UP, this._endCallback);
            element.addEventListener(enums_1.Events.MOUSE_DRAG, this._dragDrawCallback);
            element.addEventListener(enums_1.Events.MOUSE_MOVE, this._dragDrawCallback);
            element.addEventListener(enums_1.Events.MOUSE_CLICK, this._endCallback);
            element.addEventListener(enums_1.Events.TOUCH_TAP, this._endCallback);
            element.addEventListener(enums_1.Events.TOUCH_END, this._endCallback);
            element.addEventListener(enums_1.Events.TOUCH_DRAG, this._dragDrawCallback);
        };
        this._deactivateDraw = (element) => {
            store_1.state.isInteractingWithTool = false;
            element.removeEventListener(enums_1.Events.MOUSE_UP, this._endCallback);
            element.removeEventListener(enums_1.Events.MOUSE_DRAG, this._dragDrawCallback);
            element.removeEventListener(enums_1.Events.MOUSE_MOVE, this._dragDrawCallback);
            element.removeEventListener(enums_1.Events.MOUSE_CLICK, this._endCallback);
            element.removeEventListener(enums_1.Events.TOUCH_TAP, this._endCallback);
            element.removeEventListener(enums_1.Events.TOUCH_END, this._endCallback);
            element.removeEventListener(enums_1.Events.TOUCH_DRAG, this._dragDrawCallback);
        };
        this._activateModify = (element) => {
            store_1.state.isInteractingWithTool = true;
            element.addEventListener(enums_1.Events.MOUSE_UP, this._endCallback);
            element.addEventListener(enums_1.Events.MOUSE_DRAG, this._dragModifyCallback);
            element.addEventListener(enums_1.Events.MOUSE_CLICK, this._endCallback);
            element.addEventListener(enums_1.Events.TOUCH_END, this._endCallback);
            element.addEventListener(enums_1.Events.TOUCH_DRAG, this._dragModifyCallback);
            element.addEventListener(enums_1.Events.TOUCH_TAP, this._endCallback);
        };
        this._deactivateModify = (element) => {
            store_1.state.isInteractingWithTool = false;
            element.removeEventListener(enums_1.Events.MOUSE_UP, this._endCallback);
            element.removeEventListener(enums_1.Events.MOUSE_DRAG, this._dragModifyCallback);
            element.removeEventListener(enums_1.Events.MOUSE_CLICK, this._endCallback);
            element.removeEventListener(enums_1.Events.TOUCH_END, this._endCallback);
            element.removeEventListener(enums_1.Events.TOUCH_DRAG, this._dragModifyCallback);
            element.removeEventListener(enums_1.Events.TOUCH_TAP, this._endCallback);
        };
        this.renderAnnotation = (enabledElement, svgDrawingHelper) => {
            let renderStatus = true;
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
                const canvasCoordinates = points.map((p) => viewport.worldToCanvas(p));
                styleSpecifier.annotationUID = annotationUID;
                const lineWidth = this.getStyle('lineWidth', styleSpecifier, annotation);
                const lineDash = this.getStyle('lineDash', styleSpecifier, annotation);
                const color = this.getStyle('color', styleSpecifier, annotation);
                const shadow = this.getStyle('shadow', styleSpecifier, annotation);
                if (!data.cachedStats[targetId] ||
                    data.cachedStats[targetId].unit === undefined) {
                    data.cachedStats[targetId] = {
                        length: null,
                        width: null,
                        unit: null,
                    };
                    this._calculateCachedStats(annotation, renderingEngine, enabledElement);
                }
                else if (annotation.invalidated) {
                    this._throttledCalculateCachedStats(annotation, renderingEngine, enabledElement);
                }
                if (!viewport.getRenderingEngine()) {
                    console.warn('Rendering Engine has been destroyed');
                    return renderStatus;
                }
                let activeHandleCanvasCoords;
                if (!(0, annotationVisibility_1.isAnnotationVisible)(annotationUID)) {
                    continue;
                }
                if (!(0, annotationLocking_1.isAnnotationLocked)(annotation) &&
                    !this.editData &&
                    activeHandleIndex !== null) {
                    activeHandleCanvasCoords = [canvasCoordinates[activeHandleIndex]];
                }
                if (activeHandleCanvasCoords) {
                    const handleGroupUID = '0';
                    (0, drawingSvg_1.drawHandles)(svgDrawingHelper, annotationUID, handleGroupUID, activeHandleCanvasCoords, {
                        color,
                    });
                }
                const dataId1 = `${annotationUID}-line-1`;
                const dataId2 = `${annotationUID}-line-2`;
                const lineUID = '0';
                (0, drawingSvg_1.drawLine)(svgDrawingHelper, annotationUID, lineUID, canvasCoordinates[0], canvasCoordinates[1], {
                    color,
                    lineDash,
                    lineWidth,
                    shadow,
                }, dataId1);
                const secondLineUID = '1';
                (0, drawingSvg_1.drawLine)(svgDrawingHelper, annotationUID, secondLineUID, canvasCoordinates[2], canvasCoordinates[3], {
                    color,
                    lineDash,
                    lineWidth,
                    shadow,
                }, dataId2);
                renderStatus = true;
                const textLines = this._getTextLines(data, targetId);
                if (!textLines || textLines.length === 0) {
                    continue;
                }
                let canvasTextBoxCoords;
                if (!data.handles.textBox.hasMoved) {
                    canvasTextBoxCoords = (0, drawing_1.getTextBoxCoordsCanvas)(canvasCoordinates);
                    data.handles.textBox.worldPosition =
                        viewport.canvasToWorld(canvasTextBoxCoords);
                }
                const textBoxPosition = viewport.worldToCanvas(data.handles.textBox.worldPosition);
                const textBoxUID = '1';
                const boundingBox = (0, drawingSvg_1.drawLinkedTextBox)(svgDrawingHelper, annotationUID, textBoxUID, textLines, textBoxPosition, canvasCoordinates, {}, this.getLinkedTextBoxStyle(styleSpecifier, annotation));
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
        this._movingLongAxisWouldPutItThroughShortAxis = (firstLineSegment, secondLineSegment) => {
            const vectorInSecondLineDirection = gl_matrix_1.vec2.create();
            gl_matrix_1.vec2.set(vectorInSecondLineDirection, secondLineSegment.end.x - secondLineSegment.start.x, secondLineSegment.end.y - secondLineSegment.start.y);
            gl_matrix_1.vec2.normalize(vectorInSecondLineDirection, vectorInSecondLineDirection);
            const extendedSecondLineSegment = {
                start: {
                    x: secondLineSegment.start.x - vectorInSecondLineDirection[0] * 10,
                    y: secondLineSegment.start.y - vectorInSecondLineDirection[1] * 10,
                },
                end: {
                    x: secondLineSegment.end.x + vectorInSecondLineDirection[0] * 10,
                    y: secondLineSegment.end.y + vectorInSecondLineDirection[1] * 10,
                },
            };
            const proposedIntersectionPoint = lineSegment.intersectLine([extendedSecondLineSegment.start.x, extendedSecondLineSegment.start.y], [extendedSecondLineSegment.end.x, extendedSecondLineSegment.end.y], [firstLineSegment.start.x, firstLineSegment.start.y], [firstLineSegment.end.x, firstLineSegment.end.y]);
            const wouldPutThroughShortAxis = !proposedIntersectionPoint;
            return wouldPutThroughShortAxis;
        };
        this._getTextLines = (data, targetId) => {
            const { cachedStats } = data;
            const { length, width, unit } = cachedStats[targetId];
            if (length === undefined) {
                return;
            }
            const textLines = [
                `L: ${(0, roundNumber_1.default)(length)} ${unit}`,
                `W: ${(0, roundNumber_1.default)(width)} ${unit}`,
            ];
            return textLines;
        };
        this._calculateCachedStats = (annotation, renderingEngine, enabledElement) => {
            const { data } = annotation;
            const { viewportId, renderingEngineId } = enabledElement;
            const worldPos1 = data.handles.points[0];
            const worldPos2 = data.handles.points[1];
            const worldPos3 = data.handles.points[2];
            const worldPos4 = data.handles.points[3];
            const { cachedStats } = data;
            const targetIds = Object.keys(cachedStats);
            for (let i = 0; i < targetIds.length; i++) {
                const targetId = targetIds[i];
                const image = this.getTargetIdImage(targetId, renderingEngine);
                if (!image) {
                    continue;
                }
                const { imageData, dimensions } = image;
                const scale = (0, getCalibratedUnits_1.getCalibratedScale)(image);
                const dist1 = this._calculateLength(worldPos1, worldPos2) / scale;
                const dist2 = this._calculateLength(worldPos3, worldPos4) / scale;
                const length = dist1 > dist2 ? dist1 : dist2;
                const width = dist1 > dist2 ? dist2 : dist1;
                const index1 = transformWorldToIndex(imageData, worldPos1);
                const index2 = transformWorldToIndex(imageData, worldPos2);
                const index3 = transformWorldToIndex(imageData, worldPos3);
                const index4 = transformWorldToIndex(imageData, worldPos4);
                this._isInsideVolume(index1, index2, index3, index4, dimensions)
                    ? (this.isHandleOutsideImage = false)
                    : (this.isHandleOutsideImage = true);
                cachedStats[targetId] = {
                    length,
                    width,
                    unit: (0, getCalibratedUnits_1.getCalibratedLengthUnits)(null, image),
                };
            }
            annotation.invalidated = false;
            const eventType = enums_1.Events.ANNOTATION_MODIFIED;
            const eventDetail = {
                annotation,
                viewportId,
                renderingEngineId,
            };
            (0, core_1.triggerEvent)(core_1.eventTarget, eventType, eventDetail);
            return cachedStats;
        };
        this._isInsideVolume = (index1, index2, index3, index4, dimensions) => {
            return (core_1.utilities.indexWithinDimensions(index1, dimensions) &&
                core_1.utilities.indexWithinDimensions(index2, dimensions) &&
                core_1.utilities.indexWithinDimensions(index3, dimensions) &&
                core_1.utilities.indexWithinDimensions(index4, dimensions));
        };
        this._getSignedAngle = (vector1, vector2) => {
            return Math.atan2(vector1[0] * vector2[1] - vector1[1] * vector2[0], vector1[0] * vector2[0] + vector1[1] * vector2[1]);
        };
        this._throttledCalculateCachedStats = (0, throttle_1.default)(this._calculateCachedStats, 100, { trailing: true });
    }
    addNewAnnotation(evt) {
        const eventDetail = evt.detail;
        const { currentPoints, element } = eventDetail;
        const worldPos = currentPoints.world;
        const enabledElement = (0, core_1.getEnabledElement)(element);
        const { viewport, renderingEngine } = enabledElement;
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
                    points: [
                        [...worldPos],
                        [...worldPos],
                        [...worldPos],
                        [...worldPos],
                    ],
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
                    activeHandleIndex: null,
                },
                label: '',
                cachedStats: {},
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
        (0, elementCursor_1.hideElementCursor)(element);
        evt.preventDefault();
        (0, triggerAnnotationRenderForViewportIds_1.default)(renderingEngine, viewportIdsToRender);
        return annotation;
    }
    _calculateLength(pos1, pos2) {
        const dx = pos1[0] - pos2[0];
        const dy = pos1[1] - pos2[1];
        const dz = pos1[2] - pos2[2];
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
}
BidirectionalTool.toolName = 'Bidirectional';
exports.default = BidirectionalTool;
//# sourceMappingURL=BidirectionalTool.js.map