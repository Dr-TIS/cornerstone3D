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
const base_1 = require("../base");
const core_1 = require("@cornerstonejs/core");
const getCalibratedUnits_1 = require("../../utilities/getCalibratedUnits");
const roundNumber_1 = __importDefault(require("../../utilities/roundNumber"));
const throttle_1 = __importDefault(require("../../utilities/throttle"));
const stateManagement_1 = require("../../stateManagement");
const annotationLocking_1 = require("../../stateManagement/annotation/annotationLocking");
const annotationVisibility_1 = require("../../stateManagement/annotation/annotationVisibility");
const drawingSvg_1 = require("../../drawingSvg");
const store_1 = require("../../store");
const enums_1 = require("../../enums");
const viewportFilters_1 = require("../../utilities/viewportFilters");
const rectangle = __importStar(require("../../utilities/math/rectangle"));
const drawing_1 = require("../../utilities/drawing");
const getWorldWidthAndHeightFromCorners_1 = __importDefault(require("../../utilities/planar/getWorldWidthAndHeightFromCorners"));
const elementCursor_1 = require("../../cursors/elementCursor");
const triggerAnnotationRenderForViewportIds_1 = __importDefault(require("../../utilities/triggerAnnotationRenderForViewportIds"));
const getModalityUnit_1 = require("../../utilities/getModalityUnit");
const isViewportPreScaled_1 = require("../../utilities/viewport/isViewportPreScaled");
const { transformWorldToIndex } = core_1.utilities;
class RectangleROITool extends base_1.AnnotationTool {
    constructor(toolProps = {}, defaultToolProps = {
        supportedInteractionTypes: ['Mouse', 'Touch'],
        configuration: {
            shadow: true,
            preventHandleOutsideImage: false,
        },
    }) {
        super(toolProps, defaultToolProps);
        this.addNewAnnotation = (evt) => {
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
                invalidated: true,
                highlighted: true,
                metadata: {
                    toolName: this.getToolName(),
                    viewPlaneNormal: [...viewPlaneNormal],
                    viewUp: [...viewUp],
                    FrameOfReferenceUID,
                    referencedImageId,
                },
                data: {
                    label: '',
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
                    cachedStats: {},
                },
            };
            (0, stateManagement_1.addAnnotation)(annotation, element);
            const viewportIdsToRender = (0, viewportFilters_1.getViewportIdsWithToolToRender)(element, this.getToolName());
            this.editData = {
                annotation,
                viewportIdsToRender,
                handleIndex: 3,
                movingTextBox: false,
                newAnnotation: true,
                hasMoved: false,
            };
            this._activateDraw(element);
            (0, elementCursor_1.hideElementCursor)(element);
            evt.preventDefault();
            (0, triggerAnnotationRenderForViewportIds_1.default)(renderingEngine, viewportIdsToRender);
            return annotation;
        };
        this.isPointNearTool = (element, annotation, canvasCoords, proximity) => {
            const enabledElement = (0, core_1.getEnabledElement)(element);
            const { viewport } = enabledElement;
            const { data } = annotation;
            const { points } = data.handles;
            const canvasPoint1 = viewport.worldToCanvas(points[0]);
            const canvasPoint2 = viewport.worldToCanvas(points[3]);
            const rect = this._getRectangleImageCoordinates([
                canvasPoint1,
                canvasPoint2,
            ]);
            const point = [canvasCoords[0], canvasCoords[1]];
            const { left, top, width, height } = rect;
            const distanceToPoint = rectangle.distanceToPoint([left, top, width, height], point);
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
        this.handleSelectedCallback = (evt, annotation, handle) => {
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
            this.editData = null;
            this.isDrawing = false;
            if (this.isHandleOutsideImage &&
                this.configuration.preventHandleOutsideImage) {
                (0, stateManagement_1.removeAnnotation)(annotation.annotationUID);
            }
            (0, triggerAnnotationRenderForViewportIds_1.default)(renderingEngine, viewportIdsToRender);
            if (newAnnotation) {
                const eventType = enums_1.Events.ANNOTATION_COMPLETED;
                const eventDetail = {
                    annotation,
                };
                (0, core_1.triggerEvent)(core_1.eventTarget, eventType, eventDetail);
            }
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
                const { points } = data.handles;
                points.forEach((point) => {
                    point[0] += worldPosDelta[0];
                    point[1] += worldPosDelta[1];
                    point[2] += worldPosDelta[2];
                });
                annotation.invalidated = true;
            }
            else {
                const { currentPoints } = eventDetail;
                const enabledElement = (0, core_1.getEnabledElement)(element);
                const { worldToCanvas, canvasToWorld } = enabledElement.viewport;
                const worldPos = currentPoints.world;
                const { points } = data.handles;
                points[handleIndex] = [...worldPos];
                let bottomLeftCanvas;
                let bottomRightCanvas;
                let topLeftCanvas;
                let topRightCanvas;
                let bottomLeftWorld;
                let bottomRightWorld;
                let topLeftWorld;
                let topRightWorld;
                switch (handleIndex) {
                    case 0:
                    case 3:
                        bottomLeftCanvas = worldToCanvas(points[0]);
                        topRightCanvas = worldToCanvas(points[3]);
                        bottomRightCanvas = [topRightCanvas[0], bottomLeftCanvas[1]];
                        topLeftCanvas = [bottomLeftCanvas[0], topRightCanvas[1]];
                        bottomRightWorld = canvasToWorld(bottomRightCanvas);
                        topLeftWorld = canvasToWorld(topLeftCanvas);
                        points[1] = bottomRightWorld;
                        points[2] = topLeftWorld;
                        break;
                    case 1:
                    case 2:
                        bottomRightCanvas = worldToCanvas(points[1]);
                        topLeftCanvas = worldToCanvas(points[2]);
                        bottomLeftCanvas = [
                            topLeftCanvas[0],
                            bottomRightCanvas[1],
                        ];
                        topRightCanvas = [
                            bottomRightCanvas[0],
                            topLeftCanvas[1],
                        ];
                        bottomLeftWorld = canvasToWorld(bottomLeftCanvas);
                        topRightWorld = canvasToWorld(topRightCanvas);
                        points[0] = bottomLeftWorld;
                        points[3] = topRightWorld;
                        break;
                }
                annotation.invalidated = true;
            }
            this.editData.hasMoved = true;
            const enabledElement = (0, core_1.getEnabledElement)(element);
            const { renderingEngine } = enabledElement;
            (0, triggerAnnotationRenderForViewportIds_1.default)(renderingEngine, viewportIdsToRender);
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
            element.addEventListener(enums_1.Events.MOUSE_DRAG, this._dragCallback);
            element.addEventListener(enums_1.Events.MOUSE_MOVE, this._dragCallback);
            element.addEventListener(enums_1.Events.MOUSE_CLICK, this._endCallback);
            element.addEventListener(enums_1.Events.TOUCH_END, this._endCallback);
            element.addEventListener(enums_1.Events.TOUCH_DRAG, this._dragCallback);
            element.addEventListener(enums_1.Events.TOUCH_TAP, this._endCallback);
        };
        this._deactivateDraw = (element) => {
            store_1.state.isInteractingWithTool = false;
            element.removeEventListener(enums_1.Events.MOUSE_UP, this._endCallback);
            element.removeEventListener(enums_1.Events.MOUSE_DRAG, this._dragCallback);
            element.removeEventListener(enums_1.Events.MOUSE_MOVE, this._dragCallback);
            element.removeEventListener(enums_1.Events.MOUSE_CLICK, this._endCallback);
            element.removeEventListener(enums_1.Events.TOUCH_END, this._endCallback);
            element.removeEventListener(enums_1.Events.TOUCH_DRAG, this._dragCallback);
            element.removeEventListener(enums_1.Events.TOUCH_TAP, this._endCallback);
        };
        this._activateModify = (element) => {
            store_1.state.isInteractingWithTool = true;
            element.addEventListener(enums_1.Events.MOUSE_UP, this._endCallback);
            element.addEventListener(enums_1.Events.MOUSE_DRAG, this._dragCallback);
            element.addEventListener(enums_1.Events.MOUSE_CLICK, this._endCallback);
            element.addEventListener(enums_1.Events.TOUCH_END, this._endCallback);
            element.addEventListener(enums_1.Events.TOUCH_DRAG, this._dragCallback);
            element.addEventListener(enums_1.Events.TOUCH_TAP, this._endCallback);
        };
        this._deactivateModify = (element) => {
            store_1.state.isInteractingWithTool = false;
            element.removeEventListener(enums_1.Events.MOUSE_UP, this._endCallback);
            element.removeEventListener(enums_1.Events.MOUSE_DRAG, this._dragCallback);
            element.removeEventListener(enums_1.Events.MOUSE_CLICK, this._endCallback);
            element.removeEventListener(enums_1.Events.TOUCH_END, this._endCallback);
            element.removeEventListener(enums_1.Events.TOUCH_DRAG, this._dragCallback);
            element.removeEventListener(enums_1.Events.TOUCH_TAP, this._endCallback);
        };
        this.renderAnnotation = (enabledElement, svgDrawingHelper) => {
            let renderStatus = false;
            const { viewport } = enabledElement;
            const { element } = viewport;
            let annotations = (0, stateManagement_1.getAnnotations)(this.getToolName(), element);
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
                const { viewPlaneNormal, viewUp } = viewport.getCamera();
                const modalityUnitOptions = {
                    isPreScaled: (0, isViewportPreScaled_1.isViewportPreScaled)(viewport, targetId),
                    isSuvScaled: this.isSuvScaled(viewport, targetId, annotation.metadata.referencedImageId),
                };
                if (!data.cachedStats[targetId] ||
                    data.cachedStats[targetId].areaUnit === undefined) {
                    data.cachedStats[targetId] = {
                        Modality: null,
                        area: null,
                        max: null,
                        mean: null,
                        stdDev: null,
                        areaUnit: null,
                    };
                    this._calculateCachedStats(annotation, viewPlaneNormal, viewUp, renderingEngine, enabledElement, modalityUnitOptions);
                }
                else if (annotation.invalidated) {
                    this._throttledCalculateCachedStats(annotation, viewPlaneNormal, viewUp, renderingEngine, enabledElement, modalityUnitOptions);
                    if (viewport instanceof core_1.VolumeViewport) {
                        const { referencedImageId } = annotation.metadata;
                        for (const targetId in data.cachedStats) {
                            if (targetId.startsWith('imageId')) {
                                const viewports = renderingEngine.getStackViewports();
                                const invalidatedStack = viewports.find((vp) => {
                                    const referencedImageURI = core_1.utilities.imageIdToURI(referencedImageId);
                                    const hasImageURI = vp.hasImageURI(referencedImageURI);
                                    const currentImageURI = core_1.utilities.imageIdToURI(vp.getCurrentImageId());
                                    return hasImageURI && currentImageURI !== referencedImageURI;
                                });
                                if (invalidatedStack) {
                                    delete data.cachedStats[targetId];
                                }
                            }
                        }
                    }
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
                const dataId = `${annotationUID}-rect`;
                const rectangleUID = '0';
                (0, drawingSvg_1.drawRect)(svgDrawingHelper, annotationUID, rectangleUID, canvasCoordinates[0], canvasCoordinates[3], {
                    color,
                    lineDash,
                    lineWidth,
                }, dataId);
                renderStatus = true;
                const textLines = this._getTextLines(data, targetId);
                if (!textLines || textLines.length === 0) {
                    continue;
                }
                if (!data.handles.textBox.hasMoved) {
                    const canvasTextBoxCoords = (0, drawing_1.getTextBoxCoordsCanvas)(canvasCoordinates);
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
        this._getRectangleImageCoordinates = (points) => {
            const [point0, point1] = points;
            return {
                left: Math.min(point0[0], point1[0]),
                top: Math.min(point0[1], point1[1]),
                width: Math.abs(point0[0] - point1[0]),
                height: Math.abs(point0[1] - point1[1]),
            };
        };
        this._getTextLines = (data, targetId) => {
            const cachedVolumeStats = data.cachedStats[targetId];
            const { area, mean, max, stdDev, areaUnit, modalityUnit } = cachedVolumeStats;
            if (mean === undefined) {
                return;
            }
            const textLines = [];
            textLines.push(`Area: ${(0, roundNumber_1.default)(area)} ${areaUnit}`);
            textLines.push(`Mean: ${(0, roundNumber_1.default)(mean)} ${modalityUnit}`);
            textLines.push(`Max: ${(0, roundNumber_1.default)(max)} ${modalityUnit}`);
            textLines.push(`Std Dev: ${(0, roundNumber_1.default)(stdDev)} ${modalityUnit}`);
            return textLines;
        };
        this._calculateCachedStats = (annotation, viewPlaneNormal, viewUp, renderingEngine, enabledElement, modalityUnitOptions) => {
            const { data } = annotation;
            const { viewportId, renderingEngineId } = enabledElement;
            const worldPos1 = data.handles.points[0];
            const worldPos2 = data.handles.points[3];
            const { cachedStats } = data;
            const targetIds = Object.keys(cachedStats);
            for (let i = 0; i < targetIds.length; i++) {
                const targetId = targetIds[i];
                const image = this.getTargetIdImage(targetId, renderingEngine);
                if (!image) {
                    continue;
                }
                const { dimensions, imageData, metadata } = image;
                const scalarData = 'getScalarData' in image ? image.getScalarData() : image.scalarData;
                const worldPos1Index = transformWorldToIndex(imageData, worldPos1);
                worldPos1Index[0] = Math.floor(worldPos1Index[0]);
                worldPos1Index[1] = Math.floor(worldPos1Index[1]);
                worldPos1Index[2] = Math.floor(worldPos1Index[2]);
                const worldPos2Index = transformWorldToIndex(imageData, worldPos2);
                worldPos2Index[0] = Math.floor(worldPos2Index[0]);
                worldPos2Index[1] = Math.floor(worldPos2Index[1]);
                worldPos2Index[2] = Math.floor(worldPos2Index[2]);
                if (this._isInsideVolume(worldPos1Index, worldPos2Index, dimensions)) {
                    this.isHandleOutsideImage = false;
                    const iMin = Math.min(worldPos1Index[0], worldPos2Index[0]);
                    const iMax = Math.max(worldPos1Index[0], worldPos2Index[0]);
                    const jMin = Math.min(worldPos1Index[1], worldPos2Index[1]);
                    const jMax = Math.max(worldPos1Index[1], worldPos2Index[1]);
                    const kMin = Math.min(worldPos1Index[2], worldPos2Index[2]);
                    const kMax = Math.max(worldPos1Index[2], worldPos2Index[2]);
                    const { worldWidth, worldHeight } = (0, getWorldWidthAndHeightFromCorners_1.default)(viewPlaneNormal, viewUp, worldPos1, worldPos2);
                    const scale = (0, getCalibratedUnits_1.getCalibratedScale)(image);
                    const area = Math.abs(worldWidth * worldHeight) / (scale * scale);
                    let count = 0;
                    let mean = 0;
                    let stdDev = 0;
                    let max = -Infinity;
                    const yMultiple = dimensions[0];
                    const zMultiple = dimensions[0] * dimensions[1];
                    for (let k = kMin; k <= kMax; k++) {
                        for (let j = jMin; j <= jMax; j++) {
                            for (let i = iMin; i <= iMax; i++) {
                                const value = scalarData[k * zMultiple + j * yMultiple + i];
                                if (value > max) {
                                    max = value;
                                }
                                count++;
                                mean += value;
                            }
                        }
                    }
                    mean /= count;
                    for (let k = kMin; k <= kMax; k++) {
                        for (let j = jMin; j <= jMax; j++) {
                            for (let i = iMin; i <= iMax; i++) {
                                const value = scalarData[k * zMultiple + j * yMultiple + i];
                                const valueMinusMean = value - mean;
                                stdDev += valueMinusMean * valueMinusMean;
                            }
                        }
                    }
                    stdDev /= count;
                    stdDev = Math.sqrt(stdDev);
                    const modalityUnit = (0, getModalityUnit_1.getModalityUnit)(metadata.Modality, annotation.metadata.referencedImageId, modalityUnitOptions);
                    cachedStats[targetId] = {
                        Modality: metadata.Modality,
                        area,
                        mean,
                        stdDev,
                        max,
                        areaUnit: (0, getCalibratedUnits_1.getCalibratedAreaUnits)(null, image),
                        modalityUnit,
                    };
                }
                else {
                    this.isHandleOutsideImage = true;
                    cachedStats[targetId] = {
                        Modality: metadata.Modality,
                    };
                }
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
        this._isInsideVolume = (index1, index2, dimensions) => {
            return (core_1.utilities.indexWithinDimensions(index1, dimensions) &&
                core_1.utilities.indexWithinDimensions(index2, dimensions));
        };
        this._throttledCalculateCachedStats = (0, throttle_1.default)(this._calculateCachedStats, 100, { trailing: true });
    }
}
RectangleROITool.toolName = 'RectangleROI';
exports.default = RectangleROITool;
//# sourceMappingURL=RectangleROITool.js.map