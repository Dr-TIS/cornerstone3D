"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@cornerstonejs/core");
const drawingSvg_1 = require("../../drawingSvg");
const viewportFilters_1 = require("../../utilities/viewportFilters");
const elementCursor_1 = require("../../cursors/elementCursor");
const triggerAnnotationRenderForViewportIds_1 = __importDefault(require("../../utilities/triggerAnnotationRenderForViewportIds"));
const ProbeTool_1 = __importDefault(require("./ProbeTool"));
const isViewportPreScaled_1 = require("../../utilities/viewport/isViewportPreScaled");
class DragProbeTool extends ProbeTool_1.default {
    constructor(toolProps = {}, defaultToolProps = {
        supportedInteractionTypes: ['Mouse', 'Touch'],
        configuration: {
            shadow: true,
            preventHandleOutsideImage: false,
        },
    }) {
        super(toolProps, defaultToolProps);
        this.postMouseDownCallback = (evt) => {
            const eventDetail = evt.detail;
            const { currentPoints, element } = eventDetail;
            const worldPos = currentPoints.world;
            const enabledElement = (0, core_1.getEnabledElement)(element);
            const { viewport, renderingEngine } = enabledElement;
            this.isDrawing = true;
            const camera = viewport.getCamera();
            const { viewPlaneNormal, viewUp } = camera;
            const referencedImageId = this.getReferencedImageId(viewport, worldPos, viewPlaneNormal, viewUp);
            const annotation = {
                invalidated: true,
                highlighted: true,
                isVisible: true,
                metadata: {
                    toolName: this.getToolName(),
                    viewPlaneNormal: [...viewPlaneNormal],
                    viewUp: [...viewUp],
                    FrameOfReferenceUID: viewport.getFrameOfReferenceUID(),
                    referencedImageId,
                },
                data: {
                    label: '',
                    handles: { points: [[...worldPos]] },
                    cachedStats: {},
                },
            };
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
        this.postTouchStartCallback = (evt) => {
            return this.postMouseDownCallback(evt);
        };
        this.renderAnnotation = (enabledElement, svgDrawingHelper) => {
            let renderStatus = false;
            const { viewport } = enabledElement;
            if (!this.editData) {
                return renderStatus;
            }
            const annotations = this.filterInteractableAnnotationsForElement(viewport.element, [this.editData.annotation]);
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
            const annotation = this.editData.annotation;
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
            return renderStatus;
        };
    }
}
DragProbeTool.toolName = 'DragProbe';
exports.default = DragProbeTool;
//# sourceMappingURL=DragProbeTool.js.map