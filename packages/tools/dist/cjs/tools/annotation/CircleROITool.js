"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const base_1 = require("../base");
const core_1 = require("@cornerstonejs/core");
const getCalibratedUnits_1 = require("../../utilities/getCalibratedUnits");
const roundNumber_1 = __importDefault(require("../../utilities/roundNumber"));
const throttle_1 = __importDefault(require("../../utilities/throttle"));
const annotationState_1 = require("../../stateManagement/annotation/annotationState");
const annotationLocking_1 = require("../../stateManagement/annotation/annotationLocking");
const annotationVisibility_1 = require("../../stateManagement/annotation/annotationVisibility");
const drawingSvg_1 = require("../../drawingSvg");
const store_1 = require("../../store");
const enums_1 = require("../../enums");
const viewportFilters_1 = require("../../utilities/viewportFilters");
const drawing_1 = require("../../utilities/drawing");
const getWorldWidthAndHeightFromTwoPoints_1 = __importDefault(require("../../utilities/planar/getWorldWidthAndHeightFromTwoPoints"));
const elementCursor_1 = require("../../cursors/elementCursor");
const triggerAnnotationRenderForViewportIds_1 = __importDefault(require("../../utilities/triggerAnnotationRenderForViewportIds"));
const utilities_1 = require("../../utilities");
const getModalityUnit_1 = require("../../utilities/getModalityUnit");
const isViewportPreScaled_1 = require("../../utilities/viewport/isViewportPreScaled");
const circle_1 = require("../../utilities/math/circle");
const ellipse_1 = require("../../utilities/math/ellipse");
const { transformWorldToIndex } = core_1.utilities;
class CircleROITool extends base_1.AnnotationTool {
    constructor(toolProps = {}, defaultToolProps = {
        supportedInteractionTypes: ['Mouse', 'Touch'],
        configuration: {
            shadow: true,
            preventHandleOutsideImage: false,
            centerPointRadius: 0,
        },
    }) {
        super(toolProps, defaultToolProps);
        this.isHandleOutsideImage = false;
        this.addNewAnnotation = (evt) => {
            const eventDetail = evt.detail;
            const { currentPoints, element } = eventDetail;
            const worldPos = currentPoints.world;
            const canvasPos = currentPoints.canvas;
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
                    label: '',
                    handles: {
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
                        points: [[...worldPos], [...worldPos]],
                        activeHandleIndex: null,
                    },
                    cachedStats: {},
                },
            };
            (0, annotationState_1.addAnnotation)(annotation, element);
            const viewportIdsToRender = (0, viewportFilters_1.getViewportIdsWithToolToRender)(element, this.getToolName());
            this.editData = {
                annotation,
                viewportIdsToRender,
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
            const canvasCoordinates = points.map((p) => viewport.worldToCanvas(p));
            const radius = (0, circle_1.getCanvasCircleRadius)(canvasCoordinates);
            const radiusPoint = (0, circle_1.getCanvasCircleRadius)([
                canvasCoordinates[0],
                canvasCoords,
            ]);
            if (Math.abs(radiusPoint - radius) < proximity / 2)
                return true;
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
            (0, elementCursor_1.hideElementCursor)(element);
            this._activateModify(element);
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
                const { points } = data.handles;
                handleIndex = points.findIndex((p) => p === handle);
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
            annotation.highlighted = false;
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
        };
        this._dragDrawCallback = (evt) => {
            this.isDrawing = true;
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const { currentPoints } = eventDetail;
            const currentCanvasPoints = currentPoints.canvas;
            const enabledElement = (0, core_1.getEnabledElement)(element);
            const { renderingEngine, viewport } = enabledElement;
            const { canvasToWorld } = viewport;
            const { annotation, viewportIdsToRender } = this.editData;
            const { data } = annotation;
            data.handles.points = [
                data.handles.points[0],
                canvasToWorld(currentCanvasPoints),
            ];
            annotation.invalidated = true;
            this.editData.hasMoved = true;
            (0, triggerAnnotationRenderForViewportIds_1.default)(renderingEngine, viewportIdsToRender);
        };
        this._dragModifyCallback = (evt) => {
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
                this._dragHandle(evt);
                annotation.invalidated = true;
            }
            const enabledElement = (0, core_1.getEnabledElement)(element);
            const { renderingEngine } = enabledElement;
            (0, triggerAnnotationRenderForViewportIds_1.default)(renderingEngine, viewportIdsToRender);
        };
        this._dragHandle = (evt) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const enabledElement = (0, core_1.getEnabledElement)(element);
            const { canvasToWorld, worldToCanvas } = enabledElement.viewport;
            const { annotation, handleIndex } = this.editData;
            const { data } = annotation;
            const { points } = data.handles;
            const canvasCoordinates = points.map((p) => worldToCanvas(p));
            const { currentPoints } = eventDetail;
            const currentCanvasPoints = currentPoints.canvas;
            if (handleIndex === 0) {
                const dXCanvas = currentCanvasPoints[0] - canvasCoordinates[0][0];
                const dYCanvas = currentCanvasPoints[1] - canvasCoordinates[0][1];
                const canvasCenter = currentCanvasPoints;
                const canvasEnd = [
                    canvasCoordinates[1][0] + dXCanvas,
                    canvasCoordinates[1][1] + dYCanvas,
                ];
                points[0] = canvasToWorld(canvasCenter);
                points[1] = canvasToWorld(canvasEnd);
            }
            else {
                points[1] = canvasToWorld(currentCanvasPoints);
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
        this._activateDraw = (element) => {
            store_1.state.isInteractingWithTool = true;
            element.addEventListener(enums_1.Events.MOUSE_UP, this._endCallback);
            element.addEventListener(enums_1.Events.MOUSE_DRAG, this._dragDrawCallback);
            element.addEventListener(enums_1.Events.MOUSE_MOVE, this._dragDrawCallback);
            element.addEventListener(enums_1.Events.MOUSE_CLICK, this._endCallback);
            element.addEventListener(enums_1.Events.TOUCH_END, this._endCallback);
            element.addEventListener(enums_1.Events.TOUCH_DRAG, this._dragDrawCallback);
            element.addEventListener(enums_1.Events.TOUCH_TAP, this._endCallback);
        };
        this._deactivateDraw = (element) => {
            store_1.state.isInteractingWithTool = false;
            element.removeEventListener(enums_1.Events.MOUSE_UP, this._endCallback);
            element.removeEventListener(enums_1.Events.MOUSE_DRAG, this._dragDrawCallback);
            element.removeEventListener(enums_1.Events.MOUSE_MOVE, this._dragDrawCallback);
            element.removeEventListener(enums_1.Events.MOUSE_CLICK, this._endCallback);
            element.removeEventListener(enums_1.Events.TOUCH_END, this._endCallback);
            element.removeEventListener(enums_1.Events.TOUCH_DRAG, this._dragDrawCallback);
            element.removeEventListener(enums_1.Events.TOUCH_TAP, this._endCallback);
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
                const { handles } = data;
                const { points, activeHandleIndex } = handles;
                styleSpecifier.annotationUID = annotationUID;
                const lineWidth = this.getStyle('lineWidth', styleSpecifier, annotation);
                const lineDash = this.getStyle('lineDash', styleSpecifier, annotation);
                const color = this.getStyle('color', styleSpecifier, annotation);
                const canvasCoordinates = points.map((p) => viewport.worldToCanvas(p));
                const center = canvasCoordinates[0];
                const radius = (0, circle_1.getCanvasCircleRadius)(canvasCoordinates);
                const canvasCorners = (0, circle_1.getCanvasCircleCorners)(canvasCoordinates);
                const { centerPointRadius } = this.configuration;
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
                        radius: null,
                        radiusUnit: null,
                        perimeter: null,
                    };
                    this._calculateCachedStats(annotation, viewport, renderingEngine, enabledElement, modalityUnitOptions);
                }
                else if (annotation.invalidated) {
                    this._throttledCalculateCachedStats(annotation, viewport, renderingEngine, enabledElement, modalityUnitOptions);
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
                const dataId = `${annotationUID}-circle`;
                const circleUID = '0';
                (0, drawingSvg_1.drawCircle)(svgDrawingHelper, annotationUID, circleUID, center, radius, {
                    color,
                    lineDash,
                    lineWidth,
                }, dataId);
                if (centerPointRadius > 0) {
                    if (radius > 3 * centerPointRadius) {
                        (0, drawingSvg_1.drawCircle)(svgDrawingHelper, annotationUID, `${circleUID}-center`, center, centerPointRadius, {
                            color,
                            lineDash,
                            lineWidth,
                        });
                    }
                }
                renderStatus = true;
                const textLines = this._getTextLines(data, targetId);
                if (!textLines || textLines.length === 0) {
                    continue;
                }
                let canvasTextBoxCoords;
                if (!data.handles.textBox.hasMoved) {
                    canvasTextBoxCoords = (0, drawing_1.getTextBoxCoordsCanvas)(canvasCorners);
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
        this._getTextLines = (data, targetId) => {
            const cachedVolumeStats = data.cachedStats[targetId];
            const { radius, radiusUnit, area, mean, stdDev, max, isEmptyArea, Modality, areaUnit, modalityUnit, } = cachedVolumeStats;
            const textLines = [];
            if (radius) {
                const radiusLine = isEmptyArea
                    ? `Radius: Oblique not supported`
                    : `Radius: ${(0, roundNumber_1.default)(radius)} ${radiusUnit}`;
                textLines.push(radiusLine);
            }
            if (area) {
                const areaLine = isEmptyArea
                    ? `Area: Oblique not supported`
                    : `Area: ${(0, roundNumber_1.default)(area)} ${areaUnit}`;
                textLines.push(areaLine);
            }
            if (mean) {
                textLines.push(`Mean: ${(0, roundNumber_1.default)(mean)} ${modalityUnit}`);
            }
            if (max) {
                textLines.push(`Max: ${(0, roundNumber_1.default)(max)} ${modalityUnit}`);
            }
            if (stdDev) {
                textLines.push(`Std Dev: ${(0, roundNumber_1.default)(stdDev)} ${modalityUnit}`);
            }
            return textLines;
        };
        this._calculateCachedStats = (annotation, viewport, renderingEngine, enabledElement, modalityUnitOptions) => {
            const data = annotation.data;
            const { viewportId, renderingEngineId } = enabledElement;
            const { points } = data.handles;
            const canvasCoordinates = points.map((p) => viewport.worldToCanvas(p));
            const { viewPlaneNormal, viewUp } = viewport.getCamera();
            const [topLeftCanvas, bottomRightCanvas] = ((0, circle_1.getCanvasCircleCorners)(canvasCoordinates));
            const topLeftWorld = viewport.canvasToWorld(topLeftCanvas);
            const bottomRightWorld = viewport.canvasToWorld(bottomRightCanvas);
            const { cachedStats } = data;
            const targetIds = Object.keys(cachedStats);
            const worldPos1 = topLeftWorld;
            const worldPos2 = bottomRightWorld;
            for (let i = 0; i < targetIds.length; i++) {
                const targetId = targetIds[i];
                const image = this.getTargetIdImage(targetId, renderingEngine);
                if (!image) {
                    continue;
                }
                const { dimensions, imageData, metadata, hasPixelSpacing } = image;
                const worldPos1Index = transformWorldToIndex(imageData, worldPos1);
                worldPos1Index[0] = Math.floor(worldPos1Index[0]);
                worldPos1Index[1] = Math.floor(worldPos1Index[1]);
                worldPos1Index[2] = Math.floor(worldPos1Index[2]);
                const worldPos2Index = transformWorldToIndex(imageData, worldPos2);
                worldPos2Index[0] = Math.floor(worldPos2Index[0]);
                worldPos2Index[1] = Math.floor(worldPos2Index[1]);
                worldPos2Index[2] = Math.floor(worldPos2Index[2]);
                if (this._isInsideVolume(worldPos1Index, worldPos2Index, dimensions)) {
                    const iMin = Math.min(worldPos1Index[0], worldPos2Index[0]);
                    const iMax = Math.max(worldPos1Index[0], worldPos2Index[0]);
                    const jMin = Math.min(worldPos1Index[1], worldPos2Index[1]);
                    const jMax = Math.max(worldPos1Index[1], worldPos2Index[1]);
                    const kMin = Math.min(worldPos1Index[2], worldPos2Index[2]);
                    const kMax = Math.max(worldPos1Index[2], worldPos2Index[2]);
                    const boundsIJK = [
                        [iMin, iMax],
                        [jMin, jMax],
                        [kMin, kMax],
                    ];
                    const center = [
                        (topLeftWorld[0] + bottomRightWorld[0]) / 2,
                        (topLeftWorld[1] + bottomRightWorld[1]) / 2,
                        (topLeftWorld[2] + bottomRightWorld[2]) / 2,
                    ];
                    const ellipseObj = {
                        center,
                        xRadius: Math.abs(topLeftWorld[0] - bottomRightWorld[0]) / 2,
                        yRadius: Math.abs(topLeftWorld[1] - bottomRightWorld[1]) / 2,
                        zRadius: Math.abs(topLeftWorld[2] - bottomRightWorld[2]) / 2,
                    };
                    const { worldWidth, worldHeight } = (0, getWorldWidthAndHeightFromTwoPoints_1.default)(viewPlaneNormal, viewUp, worldPos1, worldPos2);
                    const isEmptyArea = worldWidth === 0 && worldHeight === 0;
                    const scale = (0, getCalibratedUnits_1.getCalibratedScale)(image);
                    const aspect = (0, getCalibratedUnits_1.getCalibratedAspect)(image);
                    const area = Math.abs(Math.PI *
                        (worldWidth / scale / 2) *
                        (worldHeight / aspect / scale / 2));
                    let count = 0;
                    let mean = 0;
                    let stdDev = 0;
                    let max = -Infinity;
                    const meanMaxCalculator = ({ value: newValue }) => {
                        if (newValue > max) {
                            max = newValue;
                        }
                        mean += newValue;
                        count += 1;
                    };
                    (0, utilities_1.pointInShapeCallback)(imageData, (pointLPS, pointIJK) => (0, ellipse_1.pointInEllipse)(ellipseObj, pointLPS), meanMaxCalculator, boundsIJK);
                    mean /= count;
                    const stdCalculator = ({ value }) => {
                        const valueMinusMean = value - mean;
                        stdDev += valueMinusMean * valueMinusMean;
                    };
                    (0, utilities_1.pointInShapeCallback)(imageData, (pointLPS, pointIJK) => (0, ellipse_1.pointInEllipse)(ellipseObj, pointLPS), stdCalculator, boundsIJK);
                    stdDev /= count;
                    stdDev = Math.sqrt(stdDev);
                    const modalityUnit = (0, getModalityUnit_1.getModalityUnit)(metadata.Modality, annotation.metadata.referencedImageId, modalityUnitOptions);
                    cachedStats[targetId] = {
                        Modality: metadata.Modality,
                        area,
                        mean,
                        max,
                        stdDev,
                        isEmptyArea,
                        areaUnit: (0, getCalibratedUnits_1.getCalibratedAreaUnits)(null, image),
                        radius: worldWidth / 2 / scale,
                        radiusUnit: (0, getCalibratedUnits_1.getCalibratedLengthUnits)(null, image),
                        perimeter: (2 * Math.PI * (worldWidth / 2)) / scale,
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
CircleROITool.toolName = 'CircleROI';
exports.default = CircleROITool;
//# sourceMappingURL=CircleROITool.js.map