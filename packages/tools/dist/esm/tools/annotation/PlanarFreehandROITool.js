import { CONSTANTS, getEnabledElement, triggerEvent, eventTarget, StackViewport, VolumeViewport, utilities as csUtils, } from '@cornerstonejs/core';
import { vec3 } from 'gl-matrix';
import { getCalibratedAreaUnits, getCalibratedScale, } from '../../utilities/getCalibratedUnits';
import roundNumber from '../../utilities/roundNumber';
import { Events } from '../../enums';
import { AnnotationTool } from '../base';
import { addAnnotation, getAnnotations, } from '../../stateManagement/annotation/annotationState';
import { polyline } from '../../utilities/math';
import { filterAnnotationsForDisplay } from '../../utilities/planar';
import throttle from '../../utilities/throttle';
import { getViewportIdsWithToolToRender } from '../../utilities/viewportFilters';
import triggerAnnotationRenderForViewportIds from '../../utilities/triggerAnnotationRenderForViewportIds';
import registerDrawLoop from './planarFreehandROITool/drawLoop';
import registerEditLoopCommon from './planarFreehandROITool/editLoopCommon';
import registerClosedContourEditLoop from './planarFreehandROITool/closedContourEditLoop';
import registerOpenContourEditLoop from './planarFreehandROITool/openContourEditLoop';
import registerOpenContourEndEditLoop from './planarFreehandROITool/openContourEndEditLoop';
import registerRenderMethods from './planarFreehandROITool/renderMethods';
import { drawLinkedTextBox } from '../../drawingSvg';
import { getTextBoxCoordsCanvas } from '../../utilities/drawing';
import { getIntersectionCoordinatesWithPolyline } from '../../utilities/math/polyline/getIntersectionWithPolyline';
import pointInShapeCallback from '../../utilities/pointInShapeCallback';
import { isViewportPreScaled } from '../../utilities/viewport/isViewportPreScaled';
import { getModalityUnit, } from '../../utilities/getModalityUnit';
const { pointCanProjectOnLine } = polyline;
const { EPSILON } = CONSTANTS;
const PARALLEL_THRESHOLD = 1 - EPSILON;
class PlanarFreehandROITool extends AnnotationTool {
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
            const enabledElement = getEnabledElement(element);
            const { viewport, renderingEngine } = enabledElement;
            const camera = viewport.getCamera();
            const { viewPlaneNormal, viewUp } = camera;
            const referencedImageId = this.getReferencedImageId(viewport, worldPos, viewPlaneNormal, viewUp);
            const viewportIdsToRender = getViewportIdsWithToolToRender(element, this.getToolName());
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
            addAnnotation(annotation, element);
            this.activateDraw(evt, annotation, viewportIdsToRender);
            evt.preventDefault();
            triggerAnnotationRenderForViewportIds(renderingEngine, viewportIdsToRender);
            return annotation;
        };
        this.handleSelectedCallback = (evt, annotation, handle) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const viewportIdsToRender = getViewportIdsWithToolToRender(element, this.getToolName());
            this.activateOpenContourEndEdit(evt, annotation, viewportIdsToRender, handle);
        };
        this.toolSelectedCallback = (evt, annotation) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const viewportIdsToRender = getViewportIdsWithToolToRender(element, this.getToolName());
            if (annotation.data.isOpenContour) {
                this.activateOpenContourEdit(evt, annotation, viewportIdsToRender);
            }
            else {
                this.activateClosedContourEdit(evt, annotation, viewportIdsToRender);
            }
        };
        this.isPointNearTool = (element, annotation, canvasCoords, proximity) => {
            const enabledElement = getEnabledElement(element);
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
            const eventType = Events.ANNOTATION_MODIFIED;
            const eventDetail = {
                annotation,
                viewportId,
                renderingEngineId,
            };
            triggerEvent(eventTarget, eventType, eventDetail);
        };
        this.triggerAnnotationCompleted = (annotation) => {
            const eventType = Events.ANNOTATION_COMPLETED;
            const eventDetail = {
                annotation,
            };
            triggerEvent(eventTarget, eventType, eventDetail);
        };
        this.renderAnnotation = (enabledElement, svgDrawingHelper) => {
            let renderStatus = false;
            const { viewport, renderingEngine } = enabledElement;
            const { element } = viewport;
            const targetId = this.getTargetId(viewport);
            let annotations = (getAnnotations(this.getToolName(), element));
            if (!annotations?.length) {
                return renderStatus;
            }
            annotations = this.filterInteractableAnnotationsForElement(element, annotations);
            if (!annotations?.length) {
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
                const activeAnnotationUID = this.commonData?.annotation.annotationUID;
                if (annotation.annotationUID === activeAnnotationUID &&
                    !this.commonData?.movingTextBox)
                    return;
                const modalityUnitOptions = {
                    isPreScaled: isViewportPreScaled(viewport, targetId),
                    isSuvScaled: this.isSuvScaled(viewport, targetId, annotation.metadata.referencedImageId),
                };
                if (!this.commonData?.movingTextBox) {
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
                const scale = getCalibratedScale(image);
                const area = polyline.calculateAreaOfPoints(canvasCoordinates) / scale / scale;
                const worldPosIndex = csUtils.transformWorldToIndex(imageData, points[0]);
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
                    const worldPosIndex = csUtils.transformWorldToIndex(imageData, points[j]);
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
                    sumSquares += newValue ** 2;
                    count += 1;
                };
                let curRow = 0;
                let intersections = [];
                let intersectionCounter = 0;
                pointInShapeCallback(imageData, (pointLPS, pointIJK) => {
                    let result = true;
                    const point = viewport.worldToCanvas(pointLPS);
                    if (point[1] != curRow) {
                        intersectionCounter = 0;
                        curRow = point[1];
                        intersections = getIntersectionCoordinatesWithPolyline(canvasCoordinates, point, [canvasPosEnd[0], point[1]]);
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
                let stdDev = sumSquares / count - mean ** 2;
                stdDev = Math.sqrt(stdDev);
                const modalityUnit = getModalityUnit(metadata.Modality, annotation.metadata.referencedImageId, modalityUnitOptions);
                cachedStats[targetId] = {
                    Modality: metadata.Modality,
                    area,
                    mean,
                    max,
                    stdDev,
                    areaUnit: getCalibratedAreaUnits(null, image),
                    modalityUnit,
                };
            }
            this.triggerAnnotationModified(annotation, enabledElement);
            annotation.invalidated = false;
            return cachedStats;
        };
        this._renderStats = (annotation, viewport, enabledElement, svgDrawingHelper) => {
            const data = annotation.data;
            const targetId = this.getTargetId(viewport);
            const textLines = this._getTextLines(data, targetId);
            if (!textLines || textLines.length === 0)
                return;
            const canvasCoordinates = data.polyline.map((p) => viewport.worldToCanvas(p));
            if (!data.handles.textBox.hasMoved) {
                const canvasTextBoxCoords = getTextBoxCoordsCanvas(canvasCoordinates);
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
            const boundingBox = drawLinkedTextBox(svgDrawingHelper, annotation.annotationUID ?? '', textBoxUID, textLines, textBoxPosition, canvasCoordinates, {}, this.getLinkedTextBoxStyle(styleSpecifier, annotation));
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
                    : `Area: ${roundNumber(area)} ${areaUnit}`;
                textLines.push(areaLine);
            }
            if (mean) {
                textLines.push(`Mean: ${roundNumber(mean)} ${modalityUnit}`);
            }
            if (max) {
                textLines.push(`Max: ${roundNumber(max)} ${modalityUnit}`);
            }
            if (stdDev) {
                textLines.push(`Std Dev: ${roundNumber(stdDev)} ${modalityUnit}`);
            }
            return textLines;
        };
        registerDrawLoop(this);
        registerEditLoopCommon(this);
        registerClosedContourEditLoop(this);
        registerOpenContourEditLoop(this);
        registerOpenContourEndEditLoop(this);
        registerRenderMethods(this);
        this._throttledCalculateCachedStats = throttle(this._calculateCachedStats, 100, { trailing: true });
    }
    filterInteractableAnnotationsForElement(element, annotations) {
        if (!annotations || !annotations.length) {
            return;
        }
        const enabledElement = getEnabledElement(element);
        const { viewport } = enabledElement;
        let annotationsToDisplay;
        if (viewport instanceof StackViewport) {
            annotationsToDisplay = filterAnnotationsForDisplay(viewport, annotations);
        }
        else if (viewport instanceof VolumeViewport) {
            const camera = viewport.getCamera();
            const { spacingInNormalDirection } = csUtils.getTargetVolumeAndSpacingInNormalDir(viewport, camera);
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
            const isParallel = Math.abs(vec3.dot(viewPlaneNormal, annotationViewPlaneNormal)) >
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
            const dir = vec3.create();
            vec3.sub(dir, focalPoint, point);
            const dot = vec3.dot(dir, viewPlaneNormal);
            if (Math.abs(dot) < halfSpacingInNormalDirection) {
                annotationsWithinSlice.push(annotation);
            }
        }
        return annotationsWithinSlice;
    }
}
PlanarFreehandROITool.toolName = 'PlanarFreehandROI';
export default PlanarFreehandROITool;
//# sourceMappingURL=PlanarFreehandROITool.js.map