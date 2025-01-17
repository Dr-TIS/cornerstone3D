import { getEnabledElement } from '@cornerstonejs/core';
import { drawHandles as drawHandlesSvg, drawTextBox as drawTextBoxSvg, } from '../../drawingSvg';
import { getViewportIdsWithToolToRender } from '../../utilities/viewportFilters';
import { hideElementCursor } from '../../cursors/elementCursor';
import triggerAnnotationRenderForViewportIds from '../../utilities/triggerAnnotationRenderForViewportIds';
import ProbeTool from './ProbeTool';
import { isViewportPreScaled } from '../../utilities/viewport/isViewportPreScaled';
class DragProbeTool extends ProbeTool {
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
            const enabledElement = getEnabledElement(element);
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
            const annotation = this.editData.annotation;
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
            return renderStatus;
        };
    }
}
DragProbeTool.toolName = 'DragProbe';
export default DragProbeTool;
//# sourceMappingURL=DragProbeTool.js.map