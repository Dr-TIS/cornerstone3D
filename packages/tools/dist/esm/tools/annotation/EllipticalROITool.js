import { AnnotationTool } from '../base';
import { getEnabledElement, VolumeViewport, eventTarget, triggerEvent, utilities as csUtils, } from '@cornerstonejs/core';
import { getCalibratedAreaUnits, getCalibratedScale, } from '../../utilities/getCalibratedUnits';
import roundNumber from '../../utilities/roundNumber';
import throttle from '../../utilities/throttle';
import { addAnnotation, getAnnotations, removeAnnotation, } from '../../stateManagement/annotation/annotationState';
import { isAnnotationLocked } from '../../stateManagement/annotation/annotationLocking';
import { isAnnotationVisible } from '../../stateManagement/annotation/annotationVisibility';
import { drawCircle as drawCircleSvg, drawEllipse as drawEllipseSvg, drawHandles as drawHandlesSvg, drawLinkedTextBox as drawLinkedTextBoxSvg, } from '../../drawingSvg';
import { state } from '../../store';
import { Events } from '../../enums';
import { getViewportIdsWithToolToRender } from '../../utilities/viewportFilters';
import { getTextBoxCoordsCanvas } from '../../utilities/drawing';
import getWorldWidthAndHeightFromTwoPoints from '../../utilities/planar/getWorldWidthAndHeightFromTwoPoints';
import { pointInEllipse, getCanvasEllipseCorners, } from '../../utilities/math/ellipse';
import { resetElementCursor, hideElementCursor, } from '../../cursors/elementCursor';
import triggerAnnotationRenderForViewportIds from '../../utilities/triggerAnnotationRenderForViewportIds';
import { pointInShapeCallback } from '../../utilities/';
import { getModalityUnit, } from '../../utilities/getModalityUnit';
import { isViewportPreScaled } from '../../utilities/viewport/isViewportPreScaled';
const { transformWorldToIndex } = csUtils;
class EllipticalROITool extends AnnotationTool {
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
            const enabledElement = getEnabledElement(element);
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
                        points: [
                            [...worldPos],
                            [...worldPos],
                            [...worldPos],
                            [...worldPos],
                        ],
                        activeHandleIndex: null,
                    },
                    cachedStats: {},
                    initialRotation: viewport.getRotation(),
                },
            };
            addAnnotation(annotation, element);
            const viewportIdsToRender = getViewportIdsWithToolToRender(element, this.getToolName());
            this.editData = {
                annotation,
                viewportIdsToRender,
                centerCanvas: canvasPos,
                newAnnotation: true,
                hasMoved: false,
            };
            this._activateDraw(element);
            hideElementCursor(element);
            evt.preventDefault();
            triggerAnnotationRenderForViewportIds(renderingEngine, viewportIdsToRender);
            return annotation;
        };
        this.isPointNearTool = (element, annotation, canvasCoords, proximity) => {
            const enabledElement = getEnabledElement(element);
            const { viewport } = enabledElement;
            const { data } = annotation;
            const { points } = data.handles;
            const canvasCoordinates = points.map((p) => viewport.worldToCanvas(p));
            const canvasCorners = getCanvasEllipseCorners(canvasCoordinates);
            const [canvasPoint1, canvasPoint2] = canvasCorners;
            const minorEllipse = {
                left: Math.min(canvasPoint1[0], canvasPoint2[0]) + proximity / 2,
                top: Math.min(canvasPoint1[1], canvasPoint2[1]) + proximity / 2,
                width: Math.abs(canvasPoint1[0] - canvasPoint2[0]) - proximity,
                height: Math.abs(canvasPoint1[1] - canvasPoint2[1]) - proximity,
            };
            const majorEllipse = {
                left: Math.min(canvasPoint1[0], canvasPoint2[0]) - proximity / 2,
                top: Math.min(canvasPoint1[1], canvasPoint2[1]) - proximity / 2,
                width: Math.abs(canvasPoint1[0] - canvasPoint2[0]) + proximity,
                height: Math.abs(canvasPoint1[1] - canvasPoint2[1]) + proximity,
            };
            const pointInMinorEllipse = this._pointInEllipseCanvas(minorEllipse, canvasCoords);
            const pointInMajorEllipse = this._pointInEllipseCanvas(majorEllipse, canvasCoords);
            if (pointInMajorEllipse && !pointInMinorEllipse) {
                return true;
            }
            return false;
        };
        this.toolSelectedCallback = (evt, annotation) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            annotation.highlighted = true;
            const viewportIdsToRender = getViewportIdsWithToolToRender(element, this.getToolName());
            this.editData = {
                annotation,
                viewportIdsToRender,
                movingTextBox: false,
            };
            hideElementCursor(element);
            this._activateModify(element);
            const enabledElement = getEnabledElement(element);
            const { renderingEngine } = enabledElement;
            triggerAnnotationRenderForViewportIds(renderingEngine, viewportIdsToRender);
            evt.preventDefault();
        };
        this.handleSelectedCallback = (evt, annotation, handle) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const { data } = annotation;
            annotation.highlighted = true;
            let movingTextBox = false;
            let handleIndex;
            let centerCanvas;
            let canvasWidth;
            let canvasHeight;
            let originalHandleCanvas;
            if (handle.worldPosition) {
                movingTextBox = true;
            }
            else {
                const { points } = data.handles;
                const enabledElement = getEnabledElement(element);
                const { worldToCanvas } = enabledElement.viewport;
                handleIndex = points.findIndex((p) => p === handle);
                const pointsCanvas = points.map(worldToCanvas);
                originalHandleCanvas = pointsCanvas[handleIndex];
                canvasWidth = Math.abs(pointsCanvas[2][0] - pointsCanvas[3][0]);
                canvasHeight = Math.abs(pointsCanvas[0][1] - pointsCanvas[1][1]);
                centerCanvas = [
                    (pointsCanvas[2][0] + pointsCanvas[3][0]) / 2,
                    (pointsCanvas[0][1] + pointsCanvas[1][1]) / 2,
                ];
            }
            const viewportIdsToRender = getViewportIdsWithToolToRender(element, this.getToolName());
            this.editData = {
                annotation,
                viewportIdsToRender,
                handleIndex,
                canvasWidth,
                canvasHeight,
                centerCanvas,
                originalHandleCanvas,
                movingTextBox,
            };
            this._activateModify(element);
            hideElementCursor(element);
            const enabledElement = getEnabledElement(element);
            const { renderingEngine } = enabledElement;
            triggerAnnotationRenderForViewportIds(renderingEngine, viewportIdsToRender);
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
            resetElementCursor(element);
            const enabledElement = getEnabledElement(element);
            const { renderingEngine } = enabledElement;
            this.editData = null;
            this.isDrawing = false;
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
        };
        this._dragDrawCallback = (evt) => {
            this.isDrawing = true;
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const { currentPoints } = eventDetail;
            const currentCanvasPoints = currentPoints.canvas;
            const enabledElement = getEnabledElement(element);
            const { renderingEngine, viewport } = enabledElement;
            const { canvasToWorld } = viewport;
            const { annotation, viewportIdsToRender, centerCanvas } = this.editData;
            const { data } = annotation;
            const dX = Math.abs(currentCanvasPoints[0] - centerCanvas[0]);
            const dY = Math.abs(currentCanvasPoints[1] - centerCanvas[1]);
            const bottomCanvas = [centerCanvas[0], centerCanvas[1] - dY];
            const topCanvas = [centerCanvas[0], centerCanvas[1] + dY];
            const leftCanvas = [centerCanvas[0] - dX, centerCanvas[1]];
            const rightCanvas = [centerCanvas[0] + dX, centerCanvas[1]];
            data.handles.points = [
                canvasToWorld(bottomCanvas),
                canvasToWorld(topCanvas),
                canvasToWorld(leftCanvas),
                canvasToWorld(rightCanvas),
            ];
            annotation.invalidated = true;
            this.editData.hasMoved = true;
            triggerAnnotationRenderForViewportIds(renderingEngine, viewportIdsToRender);
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
            const enabledElement = getEnabledElement(element);
            const { renderingEngine } = enabledElement;
            triggerAnnotationRenderForViewportIds(renderingEngine, viewportIdsToRender);
        };
        this._dragHandle = (evt) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const enabledElement = getEnabledElement(element);
            const { canvasToWorld } = enabledElement.viewport;
            const { annotation, canvasWidth, canvasHeight, handleIndex, centerCanvas, originalHandleCanvas, } = this.editData;
            const { data } = annotation;
            const { points } = data.handles;
            const { currentPoints } = eventDetail;
            const currentCanvasPoints = currentPoints.canvas;
            if (handleIndex === 0 || handleIndex === 1) {
                const dYCanvas = Math.abs(currentCanvasPoints[1] - centerCanvas[1]);
                const canvasBottom = [
                    centerCanvas[0],
                    centerCanvas[1] - dYCanvas,
                ];
                const canvasTop = [
                    centerCanvas[0],
                    centerCanvas[1] + dYCanvas,
                ];
                points[0] = canvasToWorld(canvasBottom);
                points[1] = canvasToWorld(canvasTop);
                const dXCanvas = currentCanvasPoints[0] - originalHandleCanvas[0];
                const newHalfCanvasWidth = canvasWidth / 2 + dXCanvas;
                const canvasLeft = [
                    centerCanvas[0] - newHalfCanvasWidth,
                    centerCanvas[1],
                ];
                const canvasRight = [
                    centerCanvas[0] + newHalfCanvasWidth,
                    centerCanvas[1],
                ];
                points[2] = canvasToWorld(canvasLeft);
                points[3] = canvasToWorld(canvasRight);
            }
            else {
                const dXCanvas = Math.abs(currentCanvasPoints[0] - centerCanvas[0]);
                const canvasLeft = [
                    centerCanvas[0] - dXCanvas,
                    centerCanvas[1],
                ];
                const canvasRight = [
                    centerCanvas[0] + dXCanvas,
                    centerCanvas[1],
                ];
                points[2] = canvasToWorld(canvasLeft);
                points[3] = canvasToWorld(canvasRight);
                const dYCanvas = currentCanvasPoints[1] - originalHandleCanvas[1];
                const newHalfCanvasHeight = canvasHeight / 2 + dYCanvas;
                const canvasBottom = [
                    centerCanvas[0],
                    centerCanvas[1] - newHalfCanvasHeight,
                ];
                const canvasTop = [
                    centerCanvas[0],
                    centerCanvas[1] + newHalfCanvasHeight,
                ];
                points[0] = canvasToWorld(canvasBottom);
                points[1] = canvasToWorld(canvasTop);
            }
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
                return annotation.annotationUID;
            }
        };
        this._activateModify = (element) => {
            state.isInteractingWithTool = true;
            element.addEventListener(Events.MOUSE_UP, this._endCallback);
            element.addEventListener(Events.MOUSE_DRAG, this._dragModifyCallback);
            element.addEventListener(Events.MOUSE_CLICK, this._endCallback);
            element.addEventListener(Events.TOUCH_END, this._endCallback);
            element.addEventListener(Events.TOUCH_DRAG, this._dragModifyCallback);
            element.addEventListener(Events.TOUCH_TAP, this._endCallback);
        };
        this._deactivateModify = (element) => {
            state.isInteractingWithTool = false;
            element.removeEventListener(Events.MOUSE_UP, this._endCallback);
            element.removeEventListener(Events.MOUSE_DRAG, this._dragModifyCallback);
            element.removeEventListener(Events.MOUSE_CLICK, this._endCallback);
            element.removeEventListener(Events.TOUCH_END, this._endCallback);
            element.removeEventListener(Events.TOUCH_DRAG, this._dragModifyCallback);
            element.removeEventListener(Events.TOUCH_TAP, this._endCallback);
        };
        this._activateDraw = (element) => {
            state.isInteractingWithTool = true;
            element.addEventListener(Events.MOUSE_UP, this._endCallback);
            element.addEventListener(Events.MOUSE_DRAG, this._dragDrawCallback);
            element.addEventListener(Events.MOUSE_MOVE, this._dragDrawCallback);
            element.addEventListener(Events.MOUSE_CLICK, this._endCallback);
            element.addEventListener(Events.TOUCH_END, this._endCallback);
            element.addEventListener(Events.TOUCH_DRAG, this._dragDrawCallback);
            element.addEventListener(Events.TOUCH_TAP, this._endCallback);
        };
        this._deactivateDraw = (element) => {
            state.isInteractingWithTool = false;
            element.removeEventListener(Events.MOUSE_UP, this._endCallback);
            element.removeEventListener(Events.MOUSE_DRAG, this._dragDrawCallback);
            element.removeEventListener(Events.MOUSE_MOVE, this._dragDrawCallback);
            element.removeEventListener(Events.MOUSE_CLICK, this._endCallback);
            element.removeEventListener(Events.TOUCH_END, this._endCallback);
            element.removeEventListener(Events.TOUCH_DRAG, this._dragDrawCallback);
            element.removeEventListener(Events.TOUCH_TAP, this._endCallback);
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
                const { handles } = data;
                const { points, activeHandleIndex } = handles;
                styleSpecifier.annotationUID = annotationUID;
                const lineWidth = this.getStyle('lineWidth', styleSpecifier, annotation);
                const lineDash = this.getStyle('lineDash', styleSpecifier, annotation);
                const color = this.getStyle('color', styleSpecifier, annotation);
                const canvasCoordinates = points.map((p) => viewport.worldToCanvas(p));
                const rotation = Math.abs(viewport.getRotation() - (data.initialRotation || 0));
                let canvasCorners;
                if (rotation == 90 || rotation == 270) {
                    canvasCorners = getCanvasEllipseCorners([
                        canvasCoordinates[2],
                        canvasCoordinates[3],
                        canvasCoordinates[0],
                        canvasCoordinates[1],
                    ]);
                }
                else {
                    canvasCorners = (getCanvasEllipseCorners(canvasCoordinates));
                }
                const { centerPointRadius } = this.configuration;
                const modalityUnitOptions = {
                    isPreScaled: isViewportPreScaled(viewport, targetId),
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
                    this._calculateCachedStats(annotation, viewport, renderingEngine, enabledElement, modalityUnitOptions);
                }
                else if (annotation.invalidated) {
                    this._throttledCalculateCachedStats(annotation, viewport, renderingEngine, enabledElement, modalityUnitOptions);
                    if (viewport instanceof VolumeViewport) {
                        const { referencedImageId } = annotation.metadata;
                        for (const targetId in data.cachedStats) {
                            if (targetId.startsWith('imageId')) {
                                const viewports = renderingEngine.getStackViewports();
                                const invalidatedStack = viewports.find((vp) => {
                                    const referencedImageURI = csUtils.imageIdToURI(referencedImageId);
                                    const hasImageURI = vp.hasImageURI(referencedImageURI);
                                    const currentImageURI = csUtils.imageIdToURI(vp.getCurrentImageId());
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
                if (!isAnnotationVisible(annotationUID)) {
                    continue;
                }
                if (!isAnnotationLocked(annotation) &&
                    !this.editData &&
                    activeHandleIndex !== null) {
                    activeHandleCanvasCoords = [canvasCoordinates[activeHandleIndex]];
                }
                if (activeHandleCanvasCoords) {
                    const handleGroupUID = '0';
                    drawHandlesSvg(svgDrawingHelper, annotationUID, handleGroupUID, activeHandleCanvasCoords, {
                        color,
                    });
                }
                const dataId = `${annotationUID}-ellipse`;
                const ellipseUID = '0';
                drawEllipseSvg(svgDrawingHelper, annotationUID, ellipseUID, canvasCorners[0], canvasCorners[1], {
                    color,
                    lineDash,
                    lineWidth,
                }, dataId);
                if (centerPointRadius > 0) {
                    const minRadius = Math.min(Math.abs(canvasCorners[0][0] - canvasCorners[1][0]) / 2, Math.abs(canvasCorners[0][1] - canvasCorners[1][1]) / 2);
                    if (minRadius > 3 * centerPointRadius) {
                        const centerPoint = this._getCanvasEllipseCenter(canvasCoordinates);
                        drawCircleSvg(svgDrawingHelper, annotationUID, `${ellipseUID}-center`, centerPoint, centerPointRadius, {
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
                    canvasTextBoxCoords = getTextBoxCoordsCanvas(canvasCorners);
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
        this._calculateCachedStats = (annotation, viewport, renderingEngine, enabledElement, modalityUnitOptions) => {
            const data = annotation.data;
            const { viewportId, renderingEngineId } = enabledElement;
            const { points } = data.handles;
            const canvasCoordinates = points.map((p) => viewport.worldToCanvas(p));
            const { viewPlaneNormal, viewUp } = viewport.getCamera();
            const [topLeftCanvas, bottomRightCanvas] = (getCanvasEllipseCorners(canvasCoordinates));
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
                    const { worldWidth, worldHeight } = getWorldWidthAndHeightFromTwoPoints(viewPlaneNormal, viewUp, worldPos1, worldPos2);
                    const isEmptyArea = worldWidth === 0 && worldHeight === 0;
                    const scale = getCalibratedScale(image);
                    const area = Math.abs(Math.PI * (worldWidth / 2) * (worldHeight / 2)) /
                        scale /
                        scale;
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
                    pointInShapeCallback(imageData, (pointLPS, pointIJK) => pointInEllipse(ellipseObj, pointLPS), meanMaxCalculator, boundsIJK);
                    mean /= count;
                    const stdCalculator = ({ value }) => {
                        const valueMinusMean = value - mean;
                        stdDev += valueMinusMean * valueMinusMean;
                    };
                    pointInShapeCallback(imageData, (pointLPS, pointIJK) => pointInEllipse(ellipseObj, pointLPS), stdCalculator, boundsIJK);
                    stdDev /= count;
                    stdDev = Math.sqrt(stdDev);
                    const modalityUnit = getModalityUnit(metadata.Modality, annotation.metadata.referencedImageId, modalityUnitOptions);
                    cachedStats[targetId] = {
                        Modality: metadata.Modality,
                        area,
                        mean,
                        max,
                        stdDev,
                        isEmptyArea,
                        areaUnit: getCalibratedAreaUnits(null, image),
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
            const eventType = Events.ANNOTATION_MODIFIED;
            const eventDetail = {
                annotation,
                viewportId,
                renderingEngineId,
            };
            triggerEvent(eventTarget, eventType, eventDetail);
            return cachedStats;
        };
        this._isInsideVolume = (index1, index2, dimensions) => {
            return (csUtils.indexWithinDimensions(index1, dimensions) &&
                csUtils.indexWithinDimensions(index2, dimensions));
        };
        this._throttledCalculateCachedStats = throttle(this._calculateCachedStats, 100, { trailing: true });
    }
    _pointInEllipseCanvas(ellipse, location) {
        const xRadius = ellipse.width / 2;
        const yRadius = ellipse.height / 2;
        if (xRadius <= 0.0 || yRadius <= 0.0) {
            return false;
        }
        const center = [ellipse.left + xRadius, ellipse.top + yRadius];
        const normalized = [location[0] - center[0], location[1] - center[1]];
        const inEllipse = (normalized[0] * normalized[0]) / (xRadius * xRadius) +
            (normalized[1] * normalized[1]) / (yRadius * yRadius) <=
            1.0;
        return inEllipse;
    }
    _getCanvasEllipseCenter(ellipseCanvasPoints) {
        const [bottom, top, left, right] = ellipseCanvasPoints;
        const topLeft = [left[0], top[1]];
        const bottomRight = [right[0], bottom[1]];
        return [
            (topLeft[0] + bottomRight[0]) / 2,
            (topLeft[1] + bottomRight[1]) / 2,
        ];
    }
}
EllipticalROITool.toolName = 'EllipticalROI';
export default EllipticalROITool;
//# sourceMappingURL=EllipticalROITool.js.map