import { vec3 } from 'gl-matrix';
import { getRenderingEngines, CONSTANTS, utilities as csUtils, } from '@cornerstonejs/core';
import { addAnnotation } from '../stateManagement/annotation/annotationState';
import { drawLine as drawLineSvg } from '../drawingSvg';
import { filterViewportsWithToolEnabled } from '../utilities/viewportFilters';
import triggerAnnotationRenderForViewportIds from '../utilities/triggerAnnotationRenderForViewportIds';
import AnnotationDisplayTool from './base/AnnotationDisplayTool';
const { EPSILON } = CONSTANTS;
class ReferenceLines extends AnnotationDisplayTool {
    constructor(toolProps = {}, defaultToolProps = {
        supportedInteractionTypes: ['Mouse', 'Touch'],
        configuration: {
            sourceViewportId: '',
        },
    }) {
        super(toolProps, defaultToolProps);
        this.editData = {};
        this._init = () => {
            const renderingEngines = getRenderingEngines();
            const renderingEngine = renderingEngines[0];
            if (!renderingEngine) {
                return;
            }
            let viewports = renderingEngine.getViewports();
            viewports = filterViewportsWithToolEnabled(viewports, this.getToolName());
            const sourceViewport = renderingEngine.getViewport(this.configuration.sourceViewportId);
            if (!sourceViewport || !sourceViewport.getImageData()) {
                return;
            }
            const { element } = sourceViewport;
            const { viewUp, viewPlaneNormal } = sourceViewport.getCamera();
            const sourceViewportCanvasCornersInWorld = csUtils.getViewportImageCornersInWorld(sourceViewport);
            let annotation = this.editData.annotation;
            const FrameOfReferenceUID = sourceViewport.getFrameOfReferenceUID();
            if (!annotation) {
                const newAnnotation = {
                    highlighted: true,
                    invalidated: true,
                    metadata: {
                        toolName: this.getToolName(),
                        viewPlaneNormal: [...viewPlaneNormal],
                        viewUp: [...viewUp],
                        FrameOfReferenceUID,
                        referencedImageId: null,
                    },
                    data: {
                        handles: {
                            points: sourceViewportCanvasCornersInWorld,
                        },
                    },
                };
                addAnnotation(newAnnotation, element);
                annotation = newAnnotation;
            }
            else {
                this.editData.annotation.data.handles.points =
                    sourceViewportCanvasCornersInWorld;
            }
            this.editData = {
                sourceViewport,
                renderingEngine,
                annotation,
            };
            triggerAnnotationRenderForViewportIds(renderingEngine, viewports
                .filter((viewport) => viewport.id !== sourceViewport.id)
                .map((viewport) => viewport.id));
        };
        this.onSetToolEnabled = () => {
            this._init();
        };
        this.onCameraModified = (evt) => {
            this._init();
        };
        this.renderAnnotation = (enabledElement, svgDrawingHelper) => {
            const { viewport: targetViewport } = enabledElement;
            const { annotation, sourceViewport } = this.editData;
            let renderStatus = false;
            if (!sourceViewport) {
                return renderStatus;
            }
            if (sourceViewport.id === targetViewport.id) {
                return renderStatus;
            }
            if (!annotation || !annotation?.data?.handles?.points) {
                return renderStatus;
            }
            const styleSpecifier = {
                toolGroupId: this.toolGroupId,
                toolName: this.getToolName(),
                viewportId: enabledElement.viewport.id,
            };
            const topLeft = annotation.data.handles.points[0];
            const topRight = annotation.data.handles.points[1];
            const bottomLeft = annotation.data.handles.points[2];
            const bottomRight = annotation.data.handles.points[3];
            const { focalPoint, viewPlaneNormal } = targetViewport.getCamera();
            const { viewPlaneNormal: sourceViewPlaneNormal } = sourceViewport.getCamera();
            if (this.isParallel(viewPlaneNormal, sourceViewPlaneNormal)) {
                return renderStatus;
            }
            const targetViewportPlane = csUtils.planar.planeEquation(viewPlaneNormal, focalPoint);
            const pointSet1 = [topLeft, bottomLeft, topRight, bottomRight];
            const pointSet2 = [topLeft, topRight, bottomLeft, bottomRight];
            let pointSetToUse = pointSet1;
            let topBottomVec = vec3.subtract(vec3.create(), pointSet1[0], pointSet1[1]);
            topBottomVec = vec3.normalize(vec3.create(), topBottomVec);
            let topRightVec = vec3.subtract(vec3.create(), pointSet1[2], pointSet1[0]);
            topRightVec = vec3.normalize(vec3.create(), topRightVec);
            const newNormal = vec3.cross(vec3.create(), topBottomVec, topRightVec);
            if (this.isParallel(newNormal, viewPlaneNormal)) {
                return renderStatus;
            }
            if (this.isPerpendicular(topBottomVec, viewPlaneNormal)) {
                pointSetToUse = pointSet2;
            }
            const lineStartWorld = csUtils.planar.linePlaneIntersection(pointSetToUse[0], pointSetToUse[1], targetViewportPlane);
            const lineEndWorld = csUtils.planar.linePlaneIntersection(pointSetToUse[2], pointSetToUse[3], targetViewportPlane);
            const { annotationUID } = annotation;
            styleSpecifier.annotationUID = annotationUID;
            const lineWidth = this.getStyle('lineWidth', styleSpecifier, annotation);
            const lineDash = this.getStyle('lineDash', styleSpecifier, annotation);
            const color = this.getStyle('color', styleSpecifier, annotation);
            const shadow = this.getStyle('shadow', styleSpecifier, annotation);
            const canvasCoordinates = [lineStartWorld, lineEndWorld].map((world) => targetViewport.worldToCanvas(world));
            const dataId = `${annotationUID}-line`;
            const lineUID = '1';
            drawLineSvg(svgDrawingHelper, annotationUID, lineUID, canvasCoordinates[0], canvasCoordinates[1], {
                color,
                width: lineWidth,
                lineDash,
                shadow,
            }, dataId);
            renderStatus = true;
            return renderStatus;
        };
        this.isPerpendicular = (vec1, vec2) => {
            const dot = vec3.dot(vec1, vec2);
            return Math.abs(dot) < EPSILON;
        };
    }
    isParallel(vec1, vec2) {
        return Math.abs(vec3.dot(vec1, vec2)) > 1 - EPSILON;
    }
}
ReferenceLines.toolName = 'ReferenceLines';
export default ReferenceLines;
//# sourceMappingURL=ReferenceLinesTool.js.map