import { vec2 } from 'gl-matrix';
import { getEnabledElement, VolumeViewport, triggerEvent, eventTarget, utilities as csUtils, utilities, } from '@cornerstonejs/core';
import { AnnotationTool } from '../base';
import { addAnnotation, getAnnotations, removeAnnotation, } from '../../stateManagement/annotation/annotationState';
import { drawHandles as drawHandlesSvg, drawTextBox as drawTextBoxSvg, } from '../../drawingSvg';
import { state } from '../../store';
import { Events } from '../../enums';
import { getViewportIdsWithToolToRender } from '../../utilities/viewportFilters';
import { resetElementCursor, hideElementCursor, } from '../../cursors/elementCursor';
import triggerAnnotationRenderForViewportIds from '../../utilities/triggerAnnotationRenderForViewportIds';
import { getModalityUnit, } from '../../utilities/getModalityUnit';
import { isViewportPreScaled } from '../../utilities/viewport/isViewportPreScaled';
const { transformWorldToIndex } = csUtils;
class ProbeTool extends AnnotationTool {
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
            const enabledElement = getEnabledElement(element);
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
                    handles: { points: [[...worldPos]] },
                    cachedStats: {},
                },
            };
            addAnnotation(annotation, element);
            const viewportIdsToRender = getViewportIdsWithToolToRender(element, this.getToolName());
            this.editData = {
                annotation,
                newAnnotation: true,
                viewportIdsToRender,
            };
            this._activateModify(element);
            hideElementCursor(element);
            evt.preventDefault();
            triggerAnnotationRenderForViewportIds(renderingEngine, viewportIdsToRender);
            return annotation;
        };
        this._endCallback = (evt) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const { annotation, viewportIdsToRender, newAnnotation } = this.editData;
            const enabledElement = getEnabledElement(element);
            const { renderingEngine } = enabledElement;
            const { viewportId } = enabledElement;
            this.eventDispatchDetail = {
                viewportId,
                renderingEngineId: renderingEngine.id,
            };
            this._deactivateModify(element);
            resetElementCursor(element);
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
        this._dragCallback = (evt) => {
            this.isDrawing = true;
            const eventDetail = evt.detail;
            const { currentPoints, element } = eventDetail;
            const worldPos = currentPoints.world;
            const { annotation, viewportIdsToRender } = this.editData;
            const { data } = annotation;
            data.handles.points[0] = [...worldPos];
            annotation.invalidated = true;
            const enabledElement = getEnabledElement(element);
            const { renderingEngine } = enabledElement;
            triggerAnnotationRenderForViewportIds(renderingEngine, viewportIdsToRender);
        };
        this.cancel = (element) => {
            if (this.isDrawing) {
                this.isDrawing = false;
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
            element.addEventListener(Events.MOUSE_DRAG, this._dragCallback);
            element.addEventListener(Events.MOUSE_CLICK, this._endCallback);
            element.addEventListener(Events.TOUCH_END, this._endCallback);
            element.addEventListener(Events.TOUCH_DRAG, this._dragCallback);
            element.addEventListener(Events.TOUCH_TAP, this._endCallback);
        };
        this._deactivateModify = (element) => {
            state.isInteractingWithTool = false;
            element.removeEventListener(Events.MOUSE_UP, this._endCallback);
            element.removeEventListener(Events.MOUSE_DRAG, this._dragCallback);
            element.removeEventListener(Events.MOUSE_CLICK, this._endCallback);
            element.removeEventListener(Events.TOUCH_END, this._endCallback);
            element.removeEventListener(Events.TOUCH_DRAG, this._dragCallback);
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
                const annotationUID = annotation.annotationUID;
                const data = annotation.data;
                const point = data.handles.points[0];
                const canvasCoordinates = viewport.worldToCanvas(point);
                styleSpecifier.annotationUID = annotationUID;
                const color = this.getStyle('color', styleSpecifier, annotation);
                const modalityUnitOptions = {
                    isPreScaled: isViewportPreScaled(viewport, targetId),
                    isSuvScaled: this.isSuvScaled(viewport, targetId, annotation.metadata.referencedImageId),
                };
                if (!data.cachedStats[targetId]) {
                    data.cachedStats[targetId] = {
                        Modality: null,
                        index: null,
                        value: null,
                    };
                    this._calculateCachedStats(annotation, renderingEngine, enabledElement, modalityUnitOptions);
                }
                else if (annotation.invalidated) {
                    this._calculateCachedStats(annotation, renderingEngine, enabledElement, modalityUnitOptions);
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
                const handleGroupUID = '0';
                drawHandlesSvg(svgDrawingHelper, annotationUID, handleGroupUID, [canvasCoordinates], { color });
                renderStatus = true;
                const textLines = this._getTextLines(data, targetId);
                if (textLines) {
                    const textCanvasCoordinates = [
                        canvasCoordinates[0] + 6,
                        canvasCoordinates[1] - 6,
                    ];
                    const textUID = '0';
                    drawTextBoxSvg(svgDrawingHelper, annotationUID, textUID, textLines, [textCanvasCoordinates[0], textCanvasCoordinates[1]], this.getLinkedTextBoxStyle(styleSpecifier, annotation));
                }
            }
            return renderStatus;
        };
    }
    isPointNearTool() {
        return false;
    }
    toolSelectedCallback() { }
    getHandleNearImagePoint(element, annotation, canvasCoords, proximity) {
        const enabledElement = getEnabledElement(element);
        const { viewport } = enabledElement;
        const { data } = annotation;
        const point = data.handles.points[0];
        const annotationCanvasCoordinate = viewport.worldToCanvas(point);
        const near = vec2.distance(canvasCoords, annotationCanvasCoordinate) < proximity;
        if (near === true) {
            return point;
        }
    }
    handleSelectedCallback(evt, annotation) {
        const eventDetail = evt.detail;
        const { element } = eventDetail;
        annotation.highlighted = true;
        const viewportIdsToRender = getViewportIdsWithToolToRender(element, this.getToolName());
        this.editData = {
            annotation,
            viewportIdsToRender,
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
        const { index, value, modalityUnit } = cachedVolumeStats;
        if (value === undefined) {
            return;
        }
        const textLines = [];
        textLines.push(`(${index[0]}, ${index[1]}, ${index[2]})`);
        textLines.push(`${value.toFixed(2)} ${modalityUnit}`);
        return textLines;
    }
    _calculateCachedStats(annotation, renderingEngine, enabledElement, modalityUnitOptions) {
        const data = annotation.data;
        const { viewportId, renderingEngineId } = enabledElement;
        const worldPos = data.handles.points[0];
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
            const modality = metadata.Modality;
            const index = transformWorldToIndex(imageData, worldPos);
            index[0] = Math.round(index[0]);
            index[1] = Math.round(index[1]);
            index[2] = Math.round(index[2]);
            if (csUtils.indexWithinDimensions(index, dimensions)) {
                this.isHandleOutsideImage = false;
                const yMultiple = dimensions[0];
                const zMultiple = dimensions[0] * dimensions[1];
                const value = scalarData[index[2] * zMultiple + index[1] * yMultiple + index[0]];
                if (targetId.startsWith('imageId:')) {
                    const imageId = targetId.split('imageId:')[1];
                    const imageURI = csUtils.imageIdToURI(imageId);
                    const viewports = utilities.getViewportsWithImageURI(imageURI, renderingEngineId);
                    const viewport = viewports[0];
                    index[2] = viewport.getCurrentImageIdIndex();
                }
                const modalityUnit = getModalityUnit(modality, annotation.metadata.referencedImageId, modalityUnitOptions);
                cachedStats[targetId] = {
                    index,
                    value,
                    Modality: modality,
                    modalityUnit,
                };
            }
            else {
                this.isHandleOutsideImage = true;
                cachedStats[targetId] = {
                    index,
                    Modality: modality,
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
        }
        return cachedStats;
    }
}
ProbeTool.toolName = 'Probe';
export default ProbeTool;
//# sourceMappingURL=ProbeTool.js.map