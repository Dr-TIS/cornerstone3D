"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const gl_matrix_1 = require("gl-matrix");
const core_1 = require("@cornerstonejs/core");
const annotationState_1 = require("../stateManagement/annotation/annotationState");
const drawingSvg_1 = require("../drawingSvg");
const viewportFilters_1 = require("../utilities/viewportFilters");
const triggerAnnotationRenderForViewportIds_1 = __importDefault(require("../utilities/triggerAnnotationRenderForViewportIds"));
const AnnotationDisplayTool_1 = __importDefault(require("./base/AnnotationDisplayTool"));
const { EPSILON } = core_1.CONSTANTS;
class ReferenceLines extends AnnotationDisplayTool_1.default {
    constructor(toolProps = {}, defaultToolProps = {
        supportedInteractionTypes: ['Mouse', 'Touch'],
        configuration: {
            sourceViewportId: '',
        },
    }) {
        super(toolProps, defaultToolProps);
        this.editData = {};
        this._init = () => {
            const renderingEngines = (0, core_1.getRenderingEngines)();
            const renderingEngine = renderingEngines[0];
            if (!renderingEngine) {
                return;
            }
            let viewports = renderingEngine.getViewports();
            viewports = (0, viewportFilters_1.filterViewportsWithToolEnabled)(viewports, this.getToolName());
            const sourceViewport = renderingEngine.getViewport(this.configuration.sourceViewportId);
            if (!sourceViewport || !sourceViewport.getImageData()) {
                return;
            }
            const { element } = sourceViewport;
            const { viewUp, viewPlaneNormal } = sourceViewport.getCamera();
            const sourceViewportCanvasCornersInWorld = core_1.utilities.getViewportImageCornersInWorld(sourceViewport);
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
                (0, annotationState_1.addAnnotation)(newAnnotation, element);
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
            (0, triggerAnnotationRenderForViewportIds_1.default)(renderingEngine, viewports
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
            var _a, _b;
            const { viewport: targetViewport } = enabledElement;
            const { annotation, sourceViewport } = this.editData;
            let renderStatus = false;
            if (!sourceViewport) {
                return renderStatus;
            }
            if (sourceViewport.id === targetViewport.id) {
                return renderStatus;
            }
            if (!annotation || !((_b = (_a = annotation === null || annotation === void 0 ? void 0 : annotation.data) === null || _a === void 0 ? void 0 : _a.handles) === null || _b === void 0 ? void 0 : _b.points)) {
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
            const targetViewportPlane = core_1.utilities.planar.planeEquation(viewPlaneNormal, focalPoint);
            const pointSet1 = [topLeft, bottomLeft, topRight, bottomRight];
            const pointSet2 = [topLeft, topRight, bottomLeft, bottomRight];
            let pointSetToUse = pointSet1;
            let topBottomVec = gl_matrix_1.vec3.subtract(gl_matrix_1.vec3.create(), pointSet1[0], pointSet1[1]);
            topBottomVec = gl_matrix_1.vec3.normalize(gl_matrix_1.vec3.create(), topBottomVec);
            let topRightVec = gl_matrix_1.vec3.subtract(gl_matrix_1.vec3.create(), pointSet1[2], pointSet1[0]);
            topRightVec = gl_matrix_1.vec3.normalize(gl_matrix_1.vec3.create(), topRightVec);
            const newNormal = gl_matrix_1.vec3.cross(gl_matrix_1.vec3.create(), topBottomVec, topRightVec);
            if (this.isParallel(newNormal, viewPlaneNormal)) {
                return renderStatus;
            }
            if (this.isPerpendicular(topBottomVec, viewPlaneNormal)) {
                pointSetToUse = pointSet2;
            }
            const lineStartWorld = core_1.utilities.planar.linePlaneIntersection(pointSetToUse[0], pointSetToUse[1], targetViewportPlane);
            const lineEndWorld = core_1.utilities.planar.linePlaneIntersection(pointSetToUse[2], pointSetToUse[3], targetViewportPlane);
            const { annotationUID } = annotation;
            styleSpecifier.annotationUID = annotationUID;
            const lineWidth = this.getStyle('lineWidth', styleSpecifier, annotation);
            const lineDash = this.getStyle('lineDash', styleSpecifier, annotation);
            const color = this.getStyle('color', styleSpecifier, annotation);
            const shadow = this.getStyle('shadow', styleSpecifier, annotation);
            const canvasCoordinates = [lineStartWorld, lineEndWorld].map((world) => targetViewport.worldToCanvas(world));
            const dataId = `${annotationUID}-line`;
            const lineUID = '1';
            (0, drawingSvg_1.drawLine)(svgDrawingHelper, annotationUID, lineUID, canvasCoordinates[0], canvasCoordinates[1], {
                color,
                width: lineWidth,
                lineDash,
                shadow,
            }, dataId);
            renderStatus = true;
            return renderStatus;
        };
        this.isPerpendicular = (vec1, vec2) => {
            const dot = gl_matrix_1.vec3.dot(vec1, vec2);
            return Math.abs(dot) < EPSILON;
        };
    }
    isParallel(vec1, vec2) {
        return Math.abs(gl_matrix_1.vec3.dot(vec1, vec2)) > 1 - EPSILON;
    }
}
ReferenceLines.toolName = 'ReferenceLines';
exports.default = ReferenceLines;
//# sourceMappingURL=ReferenceLinesTool.js.map