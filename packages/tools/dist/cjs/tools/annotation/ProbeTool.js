"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const gl_matrix_1 = require("gl-matrix");
const core_1 = require("@cornerstonejs/core");
const base_1 = require("../base");
const annotationState_1 = require("../../stateManagement/annotation/annotationState");
const drawingSvg_1 = require("../../drawingSvg");
const store_1 = require("../../store");
const enums_1 = require("../../enums");
const viewportFilters_1 = require("../../utilities/viewportFilters");
const elementCursor_1 = require("../../cursors/elementCursor");
const triggerAnnotationRenderForViewportIds_1 = __importDefault(require("../../utilities/triggerAnnotationRenderForViewportIds"));
const getModalityUnit_1 = require("../../utilities/getModalityUnit");
const isViewportPreScaled_1 = require("../../utilities/viewport/isViewportPreScaled");
const { transformWorldToIndex } = core_1.utilities;
class ProbeTool extends base_1.AnnotationTool {
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
                    handles: { points: [[...worldPos]] },
                    cachedStats: {},
                },
            };
            (0, annotationState_1.addAnnotation)(annotation, element);
            const viewportIdsToRender = (0, viewportFilters_1.getViewportIdsWithToolToRender)(element, this.getToolName());
            this.editData = {
                annotation,
                newAnnotation: true,
                viewportIdsToRender,
            };
            this._activateModify(element);
            (0, elementCursor_1.hideElementCursor)(element);
            evt.preventDefault();
            (0, triggerAnnotationRenderForViewportIds_1.default)(renderingEngine, viewportIdsToRender);
            return annotation;
        };
        this._endCallback = (evt) => {
            const eventDetail = evt.detail;
            const { element } = eventDetail;
            const { annotation, viewportIdsToRender, newAnnotation } = this.editData;
            const enabledElement = (0, core_1.getEnabledElement)(element);
            const { renderingEngine } = enabledElement;
            const { viewportId } = enabledElement;
            this.eventDispatchDetail = {
                viewportId,
                renderingEngineId: renderingEngine.id,
            };
            this._deactivateModify(element);
            (0, elementCursor_1.resetElementCursor)(element);
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
        this._dragCallback = (evt) => {
            this.isDrawing = true;
            const eventDetail = evt.detail;
            const { currentPoints, element } = eventDetail;
            const worldPos = currentPoints.world;
            const { annotation, viewportIdsToRender } = this.editData;
            const { data } = annotation;
            data.handles.points[0] = [...worldPos];
            annotation.invalidated = true;
            const enabledElement = (0, core_1.getEnabledElement)(element);
            const { renderingEngine } = enabledElement;
            (0, triggerAnnotationRenderForViewportIds_1.default)(renderingEngine, viewportIdsToRender);
        };
        this.cancel = (element) => {
            if (this.isDrawing) {
                this.isDrawing = false;
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
                const annotationUID = annotation.annotationUID;
                const data = annotation.data;
                const point = data.handles.points[0];
                const canvasCoordinates = viewport.worldToCanvas(point);
                styleSpecifier.annotationUID = annotationUID;
                const color = this.getStyle('color', styleSpecifier, annotation);
                const modalityUnitOptions = {
                    isPreScaled: (0, isViewportPreScaled_1.isViewportPreScaled)(viewport, targetId),
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
                const handleGroupUID = '0';
                (0, drawingSvg_1.drawHandles)(svgDrawingHelper, annotationUID, handleGroupUID, [canvasCoordinates], { color });
                renderStatus = true;
                const textLines = this._getTextLines(data, targetId);
                if (textLines) {
                    const textCanvasCoordinates = [
                        canvasCoordinates[0] + 6,
                        canvasCoordinates[1] - 6,
                    ];
                    const textUID = '0';
                    (0, drawingSvg_1.drawTextBox)(svgDrawingHelper, annotationUID, textUID, textLines, [textCanvasCoordinates[0], textCanvasCoordinates[1]], this.getLinkedTextBoxStyle(styleSpecifier, annotation));
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
        const enabledElement = (0, core_1.getEnabledElement)(element);
        const { viewport } = enabledElement;
        const { data } = annotation;
        const point = data.handles.points[0];
        const annotationCanvasCoordinate = viewport.worldToCanvas(point);
        const near = gl_matrix_1.vec2.distance(canvasCoords, annotationCanvasCoordinate) < proximity;
        if (near === true) {
            return point;
        }
    }
    handleSelectedCallback(evt, annotation) {
        const eventDetail = evt.detail;
        const { element } = eventDetail;
        annotation.highlighted = true;
        const viewportIdsToRender = (0, viewportFilters_1.getViewportIdsWithToolToRender)(element, this.getToolName());
        this.editData = {
            annotation,
            viewportIdsToRender,
        };
        this._activateModify(element);
        (0, elementCursor_1.hideElementCursor)(element);
        const enabledElement = (0, core_1.getEnabledElement)(element);
        const { renderingEngine } = enabledElement;
        (0, triggerAnnotationRenderForViewportIds_1.default)(renderingEngine, viewportIdsToRender);
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
            if (core_1.utilities.indexWithinDimensions(index, dimensions)) {
                this.isHandleOutsideImage = false;
                const yMultiple = dimensions[0];
                const zMultiple = dimensions[0] * dimensions[1];
                const value = scalarData[index[2] * zMultiple + index[1] * yMultiple + index[0]];
                if (targetId.startsWith('imageId:')) {
                    const imageId = targetId.split('imageId:')[1];
                    const imageURI = core_1.utilities.imageIdToURI(imageId);
                    const viewports = core_1.utilities.getViewportsWithImageURI(imageURI, renderingEngineId);
                    const viewport = viewports[0];
                    index[2] = viewport.getCurrentImageIdIndex();
                }
                const modalityUnit = (0, getModalityUnit_1.getModalityUnit)(modality, annotation.metadata.referencedImageId, modalityUnitOptions);
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
            const eventType = enums_1.Events.ANNOTATION_MODIFIED;
            const eventDetail = {
                annotation,
                viewportId,
                renderingEngineId,
            };
            (0, core_1.triggerEvent)(core_1.eventTarget, eventType, eventDetail);
        }
        return cachedStats;
    }
}
ProbeTool.toolName = 'Probe';
exports.default = ProbeTool;
//# sourceMappingURL=ProbeTool.js.map