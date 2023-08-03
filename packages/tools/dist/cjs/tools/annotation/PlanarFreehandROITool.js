"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@cornerstonejs/core");
const gl_matrix_1 = require("gl-matrix");
const getCalibratedUnits_1 = require("../../utilities/getCalibratedUnits");
const roundNumber_1 = __importDefault(require("../../utilities/roundNumber"));
const enums_1 = require("../../enums");
const base_1 = require("../base");
const annotationState_1 = require("../../stateManagement/annotation/annotationState");
const math_1 = require("../../utilities/math");
const planar_1 = require("../../utilities/planar");
const throttle_1 = __importDefault(require("../../utilities/throttle"));
const viewportFilters_1 = require("../../utilities/viewportFilters");
const triggerAnnotationRenderForViewportIds_1 = __importDefault(require("../../utilities/triggerAnnotationRenderForViewportIds"));
const drawLoop_1 = __importDefault(require("./planarFreehandROITool/drawLoop"));
const editLoopCommon_1 = __importDefault(require("./planarFreehandROITool/editLoopCommon"));
const closedContourEditLoop_1 = __importDefault(require("./planarFreehandROITool/closedContourEditLoop"));
const openContourEditLoop_1 = __importDefault(require("./planarFreehandROITool/openContourEditLoop"));
const openContourEndEditLoop_1 = __importDefault(require("./planarFreehandROITool/openContourEndEditLoop"));
const renderMethods_1 = __importDefault(require("./planarFreehandROITool/renderMethods"));
const drawingSvg_1 = require("../../drawingSvg");
const drawing_1 = require("../../utilities/drawing");
const getIntersectionWithPolyline_1 = require("../../utilities/math/polyline/getIntersectionWithPolyline");
const pointInShapeCallback_1 = __importDefault(require("../../utilities/pointInShapeCallback"));
const isViewportPreScaled_1 = require("../../utilities/viewport/isViewportPreScaled");
const getModalityUnit_1 = require("../../utilities/getModalityUnit");
const { pointCanProjectOnLine } = math_1.polyline;
const { EPSILON } = core_1.CONSTANTS;
const PARALLEL_THRESHOLD = 1 - EPSILON;
class PlanarFreehandROITool extends base_1.AnnotationTool {
    constructor(toolProps = {}, defaultToolProps = {
        supportedInteractionTypes: ['Mouse', 'Touch'],
        configuration: {
            shadow: true,
            preventHandleOutsideImage: false,
            alwaysRenderOpenContourHandles: {
                enabled: false,
                radius: 2,
            },
            allowOpenContours: true,
            closeContourProximity: 10,
            checkCanvasEditFallbackProximity: 6,
            subPixelResolution: 4,
            interpolation: {
                interpolateOnAdd: false,
                interpolateOnEdit: false,
                knotsRatioPercentageOnAdd: 40,
                knotsRatioPercentageOnEdit: 40,
            },
            calculateStats: false,
        },
    }) {
        super(toolProps, defaultToolProps);
        this.isDrawing = false;
        this.isEditingClosed = false;
        this.isEditingOpen = false;
        this.addNewAnnotation = (evt) => {
            const eventDetail = evt.detail;
            const { currentPoints, element } = eventDetail;
            const worldPos = currentPoints.world;
            const enabledElement = (0, core_1.getEnabledElement)(element);
            const { viewport, renderingEngine } = enabledElement;
            const camera = viewport.getCamera();
            const { viewPlaneNormal, viewUp } = camera;
            const referencedImageId = this.getReferencedImageId(viewport, worldPos, viewPlaneNormal, viewUp);
            const viewportIdsToRender = (0, viewportFilters_1.getViewportIdsWithToolToRender)(element, this.getToolName());
            const FrameOfReferenceUID = viewport.getFrameOfReferenceUID();
            const annotation = {
                highlighted: true,
                invalidated: true,
                metadata: {
                    viewPlaneNormal: [...viewPlaneNormal],
                    viewUp: [...viewUp],
                    FrameOfReferenceUID,
                    referencedImageId,
                    toolName: this.getToolName(),
                },
                data: {
                    handles: {
                        points: [],
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
                    polyline: [[...worldPos]],
                    label: '',
                    cachedStats: {},
                },
            };
            (0, annotationState_1.addAnnotation)(annotation, element);
            this.activateDraw(evt, annotation, viewportIdsToRender);
            evt.preventDefault();
            (0, triggerAnnotationRenderForViewportIds_1.default)(renderingEngine, viewportIdsToRender);
            return annotation;
        };
        this.handleSelectedCallback = (evt, annotation, handle) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const viewportIdsToRender = (0, viewportFilters_1.getViewportIdsWithToolToRender)(element, this.getToolName());
            this.activateOpenContourEndEdit(evt, annotation, viewportIdsToRender, handle);
        };
        this.toolSelectedCallback = (evt, annotation) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const viewportIdsToRender = (0, viewportFilters_1.getViewportIdsWithToolToRender)(element, this.getToolName());
            if (annotation.data.isOpenContour) {
                this.activateOpenContourEdit(evt, annotation, viewportIdsToRender);
            }
            else {
                this.activateClosedContourEdit(evt, annotation, viewportIdsToRender);
            }
        };
        this.isPointNearTool = (element, annotation, canvasCoords, proximity) => {
            const enabledElement = (0, core_1.getEnabledElement)(element);
            const { viewport } = enabledElement;
            const points = annotation.data.polyline;
            let previousPoint = viewport.worldToCanvas(points[0]);
            for (let i = 1; i < points.length; i++) {
                const p1 = previousPoint;
                const p2 = viewport.worldToCanvas(points[i]);
                const distance = pointCanProjectOnLine(canvasCoords, p1, p2, proximity);
                if (distance === true) {
                    return true;
                }
                previousPoint = p2;
            }
            if (annotation.data.isOpenContour) {
                return false;
            }
            const pStart = viewport.worldToCanvas(points[0]);
            const pEnd = viewport.worldToCanvas(points[points.length - 1]);
            const distance = pointCanProjectOnLine(canvasCoords, pStart, pEnd, proximity);
            if (distance === true) {
                return true;
            }
            return false;
        };
        this.cancel = (element) => {
            const isDrawing = this.isDrawing;
            const isEditingOpen = this.isEditingOpen;
            const isEditingClosed = this.isEditingClosed;
            if (isDrawing) {
                this.cancelDrawing(element);
            }
            else if (isEditingOpen) {
                this.cancelOpenContourEdit(element);
            }
            else if (isEditingClosed) {
                this.cancelClosedContourEdit(element);
            }
        };
        this.triggerAnnotationModified = (annotation, enabledElement) => {
            const { viewportId, renderingEngineId } = enabledElement;
            const eventType = enums_1.Events.ANNOTATION_MODIFIED;
            const eventDetail = {
                annotation,
                viewportId,
                renderingEngineId,
            };
            (0, core_1.triggerEvent)(core_1.eventTarget, eventType, eventDetail);
        };
        this.triggerAnnotationCompleted = (annotation) => {
            const eventType = enums_1.Events.ANNOTATION_COMPLETED;
            const eventDetail = {
                annotation,
            };
            (0, core_1.triggerEvent)(core_1.eventTarget, eventType, eventDetail);
        };
        this.renderAnnotation = (enabledElement, svgDrawingHelper) => {
            let renderStatus = false;
            const { viewport, renderingEngine } = enabledElement;
            const { element } = viewport;
            const targetId = this.getTargetId(viewport);
            let annotations = ((0, annotationState_1.getAnnotations)(this.getToolName(), element));
            if (!(annotations === null || annotations === void 0 ? void 0 : annotations.length)) {
                return renderStatus;
            }
            annotations = this.filterInteractableAnnotationsForElement(element, annotations);
            if (!(annotations === null || annotations === void 0 ? void 0 : annotations.length)) {
                return renderStatus;
            }
            const isDrawing = this.isDrawing;
            const isEditingOpen = this.isEditingOpen;
            const isEditingClosed = this.isEditingClosed;
            if (!(isDrawing || isEditingOpen || isEditingClosed)) {
                annotations.forEach((annotation) => {
                    this.renderContour(enabledElement, svgDrawingHelper, annotation);
                });
            }
            else {
                const activeAnnotationUID = this.commonData.annotation.annotationUID;
                annotations.forEach((annotation) => {
                    if (annotation.annotationUID === activeAnnotationUID) {
                        if (isDrawing) {
                            this.renderContourBeingDrawn(enabledElement, svgDrawingHelper, annotation);
                        }
                        else if (isEditingClosed) {
                            this.renderClosedContourBeingEdited(enabledElement, svgDrawingHelper, annotation);
                        }
                        else if (isEditingOpen) {
                            this.renderOpenContourBeingEdited(enabledElement, svgDrawingHelper, annotation);
                        }
                        else {
                            throw new Error(`Unknown ${this.getToolName()} annotation rendering state`);
                        }
                    }
                    else {
                        this.renderContour(enabledElement, svgDrawingHelper, annotation);
                    }
                });
                renderStatus = true;
            }
            if (!this.configuration.calculateStats)
                return;
            annotations.forEach((annotation) => {
                var _a, _b, _c;
                const activeAnnotationUID = (_a = this.commonData) === null || _a === void 0 ? void 0 : _a.annotation.annotationUID;
                if (annotation.annotationUID === activeAnnotationUID &&
                    !((_b = this.commonData) === null || _b === void 0 ? void 0 : _b.movingTextBox))
                    return;
                const modalityUnitOptions = {
                    isPreScaled: (0, isViewportPreScaled_1.isViewportPreScaled)(viewport, targetId),
                    isSuvScaled: this.isSuvScaled(viewport, targetId, annotation.metadata.referencedImageId),
                };
                if (!((_c = this.commonData) === null || _c === void 0 ? void 0 : _c.movingTextBox)) {
                    const { data } = annotation;
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
                        this._calculateCachedStats(annotation, viewport, renderingEngine, enabledElement, modalityUnitOptions);
                    }
                    else if (annotation.invalidated) {
                        this._throttledCalculateCachedStats(annotation, viewport, renderingEngine, enabledElement, modalityUnitOptions);
                    }
                }
                this._renderStats(annotation, viewport, enabledElement, svgDrawingHelper);
            });
            return renderStatus;
        };
        this._calculateCachedStats = (annotation, viewport, renderingEngine, enabledElement, modalityUnitOptions) => {
            const data = annotation.data;
            const { cachedStats, polyline: points } = data;
            const targetIds = Object.keys(cachedStats);
            for (let i = 0; i < targetIds.length; i++) {
                const targetId = targetIds[i];
                const image = this.getTargetIdImage(targetId, renderingEngine);
                if (!image) {
                    continue;
                }
                const { imageData, metadata } = image;
                const canvasCoordinates = points.map((p) => viewport.worldToCanvas(p));
                const scale = (0, getCalibratedUnits_1.getCalibratedScale)(image);
                const area = math_1.polyline.calculateAreaOfPoints(canvasCoordinates) / scale / scale;
                const worldPosIndex = core_1.utilities.transformWorldToIndex(imageData, points[0]);
                worldPosIndex[0] = Math.floor(worldPosIndex[0]);
                worldPosIndex[1] = Math.floor(worldPosIndex[1]);
                worldPosIndex[2] = Math.floor(worldPosIndex[2]);
                let iMin = worldPosIndex[0];
                let iMax = worldPosIndex[0];
                let jMin = worldPosIndex[1];
                let jMax = worldPosIndex[1];
                let kMin = worldPosIndex[2];
                let kMax = worldPosIndex[2];
                for (let j = 1; j < points.length; j++) {
                    const worldPosIndex = core_1.utilities.transformWorldToIndex(imageData, points[j]);
                    worldPosIndex[0] = Math.floor(worldPosIndex[0]);
                    worldPosIndex[1] = Math.floor(worldPosIndex[1]);
                    worldPosIndex[2] = Math.floor(worldPosIndex[2]);
                    iMin = Math.min(iMin, worldPosIndex[0]);
                    iMax = Math.max(iMax, worldPosIndex[0]);
                    jMin = Math.min(jMin, worldPosIndex[1]);
                    jMax = Math.max(jMax, worldPosIndex[1]);
                    kMin = Math.min(kMin, worldPosIndex[2]);
                    kMax = Math.max(kMax, worldPosIndex[2]);
                }
                const iDelta = 0.01 * (iMax - iMin);
                const jDelta = 0.01 * (jMax - jMin);
                const kDelta = 0.01 * (kMax - kMin);
                iMin = Math.floor(iMin - iDelta);
                iMax = Math.ceil(iMax + iDelta);
                jMin = Math.floor(jMin - jDelta);
                jMax = Math.ceil(jMax + jDelta);
                kMin = Math.floor(kMin - kDelta);
                kMax = Math.ceil(kMax + kDelta);
                const boundsIJK = [
                    [iMin, iMax],
                    [jMin, jMax],
                    [kMin, kMax],
                ];
                const worldPosEnd = imageData.indexToWorld([iMax, jMax, kMax]);
                const canvasPosEnd = viewport.worldToCanvas(worldPosEnd);
                let count = 0;
                let sum = 0;
                let sumSquares = 0;
                let max = -Infinity;
                const statCalculator = ({ value: newValue }) => {
                    if (newValue > max) {
                        max = newValue;
                    }
                    sum += newValue;
                    sumSquares += Math.pow(newValue, 2);
                    count += 1;
                };
                let curRow = 0;
                let intersections = [];
                let intersectionCounter = 0;
                (0, pointInShapeCallback_1.default)(imageData, (pointLPS, pointIJK) => {
                    let result = true;
                    const point = viewport.worldToCanvas(pointLPS);
                    if (point[1] != curRow) {
                        intersectionCounter = 0;
                        curRow = point[1];
                        intersections = (0, getIntersectionWithPolyline_1.getIntersectionCoordinatesWithPolyline)(canvasCoordinates, point, [canvasPosEnd[0], point[1]]);
                        intersections.sort((function (index) {
                            return function (a, b) {
                                return a[index] === b[index]
                                    ? 0
                                    : a[index] < b[index]
                                        ? -1
                                        : 1;
                            };
                        })(0));
                    }
                    if (intersections.length && point[0] > intersections[0][0]) {
                        intersections.shift();
                        intersectionCounter++;
                    }
                    if (intersectionCounter % 2 === 0) {
                        result = false;
                    }
                    return result;
                }, statCalculator, boundsIJK);
                const mean = sum / count;
                let stdDev = sumSquares / count - Math.pow(mean, 2);
                stdDev = Math.sqrt(stdDev);
                const modalityUnit = (0, getModalityUnit_1.getModalityUnit)(metadata.Modality, annotation.metadata.referencedImageId, modalityUnitOptions);
                cachedStats[targetId] = {
                    Modality: metadata.Modality,
                    area,
                    mean,
                    max,
                    stdDev,
                    areaUnit: (0, getCalibratedUnits_1.getCalibratedAreaUnits)(null, image),
                    modalityUnit,
                };
            }
            this.triggerAnnotationModified(annotation, enabledElement);
            annotation.invalidated = false;
            return cachedStats;
        };
        this._renderStats = (annotation, viewport, enabledElement, svgDrawingHelper) => {
            var _a;
            const data = annotation.data;
            const targetId = this.getTargetId(viewport);
            const textLines = this._getTextLines(data, targetId);
            if (!textLines || textLines.length === 0)
                return;
            const canvasCoordinates = data.polyline.map((p) => viewport.worldToCanvas(p));
            if (!data.handles.textBox.hasMoved) {
                const canvasTextBoxCoords = (0, drawing_1.getTextBoxCoordsCanvas)(canvasCoordinates);
                data.handles.textBox.worldPosition =
                    viewport.canvasToWorld(canvasTextBoxCoords);
            }
            const textBoxPosition = viewport.worldToCanvas(data.handles.textBox.worldPosition);
            const styleSpecifier = {
                toolGroupId: this.toolGroupId,
                toolName: this.getToolName(),
                viewportId: enabledElement.viewport.id,
            };
            const textBoxUID = '1';
            const boundingBox = (0, drawingSvg_1.drawLinkedTextBox)(svgDrawingHelper, (_a = annotation.annotationUID) !== null && _a !== void 0 ? _a : '', textBoxUID, textLines, textBoxPosition, canvasCoordinates, {}, this.getLinkedTextBoxStyle(styleSpecifier, annotation));
            const { x: left, y: top, width, height } = boundingBox;
            data.handles.textBox.worldBoundingBox = {
                topLeft: viewport.canvasToWorld([left, top]),
                topRight: viewport.canvasToWorld([left + width, top]),
                bottomLeft: viewport.canvasToWorld([left, top + height]),
                bottomRight: viewport.canvasToWorld([left + width, top + height]),
            };
        };
        this._getTextLines = (data, targetId) => {
            const cachedVolumeStats = data.cachedStats[targetId];
            const { area, mean, stdDev, max, isEmptyArea, areaUnit, modalityUnit } = cachedVolumeStats;
            const textLines = [];
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
        (0, drawLoop_1.default)(this);
        (0, editLoopCommon_1.default)(this);
        (0, closedContourEditLoop_1.default)(this);
        (0, openContourEditLoop_1.default)(this);
        (0, openContourEndEditLoop_1.default)(this);
        (0, renderMethods_1.default)(this);
        this._throttledCalculateCachedStats = (0, throttle_1.default)(this._calculateCachedStats, 100, { trailing: true });
    }
    filterInteractableAnnotationsForElement(element, annotations) {
        if (!annotations || !annotations.length) {
            return;
        }
        const enabledElement = (0, core_1.getEnabledElement)(element);
        const { viewport } = enabledElement;
        let annotationsToDisplay;
        if (viewport instanceof core_1.StackViewport) {
            annotationsToDisplay = (0, planar_1.filterAnnotationsForDisplay)(viewport, annotations);
        }
        else if (viewport instanceof core_1.VolumeViewport) {
            const camera = viewport.getCamera();
            const { spacingInNormalDirection } = core_1.utilities.getTargetVolumeAndSpacingInNormalDir(viewport, camera);
            annotationsToDisplay = this.filterAnnotationsWithinSlice(annotations, camera, spacingInNormalDirection);
        }
        else {
            throw new Error(`Viewport Type ${viewport.type} not supported`);
        }
        return annotationsToDisplay;
    }
    filterAnnotationsWithinSlice(annotations, camera, spacingInNormalDirection) {
        const { viewPlaneNormal } = camera;
        const annotationsWithParallelNormals = annotations.filter((td) => {
            const annotationViewPlaneNormal = td.metadata.viewPlaneNormal;
            const isParallel = Math.abs(gl_matrix_1.vec3.dot(viewPlaneNormal, annotationViewPlaneNormal)) >
                PARALLEL_THRESHOLD;
            return annotationViewPlaneNormal && isParallel;
        });
        if (!annotationsWithParallelNormals.length) {
            return [];
        }
        const halfSpacingInNormalDirection = spacingInNormalDirection / 2;
        const { focalPoint } = camera;
        const annotationsWithinSlice = [];
        for (const annotation of annotationsWithParallelNormals) {
            const data = annotation.data;
            const point = data.polyline[0];
            if (!annotation.isVisible) {
                continue;
            }
            const dir = gl_matrix_1.vec3.create();
            gl_matrix_1.vec3.sub(dir, focalPoint, point);
            const dot = gl_matrix_1.vec3.dot(dir, viewPlaneNormal);
            if (Math.abs(dot) < halfSpacingInNormalDirection) {
                annotationsWithinSlice.push(annotation);
            }
        }
        return annotationsWithinSlice;
    }
}
PlanarFreehandROITool.toolName = 'PlanarFreehandROI';
exports.default = PlanarFreehandROITool;
//# sourceMappingURL=PlanarFreehandROITool.js.map