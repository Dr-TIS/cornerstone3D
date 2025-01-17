"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const gl_matrix_1 = require("gl-matrix");
const Math_1 = __importDefault(require("@kitware/vtk.js/Common/Core/Math"));
const core_1 = require("@cornerstonejs/core");
const base_1 = require("./base");
class ZoomTool extends base_1.BaseTool {
    constructor(toolProps = {}, defaultToolProps = {
        supportedInteractionTypes: ['Mouse', 'Touch'],
        configuration: {
            zoomToCenter: false,
            minZoomScale: 0.1,
            maxZoomScale: 30,
            pinchToZoom: true,
            pan: true,
            invert: false,
        },
    }) {
        super(toolProps, defaultToolProps);
        this.preMouseDownCallback = (evt) => {
            const eventData = evt.detail;
            const { element, currentPoints } = eventData;
            const worldPos = currentPoints.world;
            const enabledElement = (0, core_1.getEnabledElement)(element);
            const camera = enabledElement.viewport.getCamera();
            const { focalPoint } = camera;
            this.initialMousePosWorld = worldPos;
            let dirVec = gl_matrix_1.vec3.fromValues(focalPoint[0] - worldPos[0], focalPoint[1] - worldPos[1], focalPoint[2] - worldPos[2]);
            dirVec = gl_matrix_1.vec3.normalize(gl_matrix_1.vec3.create(), dirVec);
            this.dirVec = dirVec;
            return false;
        };
        this.preTouchStartCallback = (evt) => {
            if (!this.configuration.pinchToZoom) {
                return this.preMouseDownCallback(evt);
            }
        };
        this._dragParallelProjection = (evt, viewport, camera, pinch = false) => {
            const { element, deltaPoints } = evt.detail;
            const deltaY = pinch
                ? evt.detail.deltaDistance.canvas
                : deltaPoints.canvas[1];
            const size = [element.clientWidth, element.clientHeight];
            const { parallelScale, focalPoint, position } = camera;
            const zoomScale = 1.5 / size[1];
            const k = deltaY * zoomScale * (this.configuration.invert ? -1 : 1);
            let parallelScaleToSet = (1.0 - k) * parallelScale;
            let focalPointToSet = focalPoint;
            let positionToSet = position;
            if (!this.configuration.zoomToCenter) {
                const distanceToCanvasCenter = gl_matrix_1.vec3.distance(focalPoint, this.initialMousePosWorld);
                const zoomScale = 5 / size[1];
                const k = deltaY * zoomScale * (this.configuration.invert ? -1 : 1);
                parallelScaleToSet = (1.0 - k) * parallelScale;
                positionToSet = gl_matrix_1.vec3.scaleAndAdd(gl_matrix_1.vec3.create(), position, this.dirVec, -distanceToCanvasCenter * k);
                focalPointToSet = gl_matrix_1.vec3.scaleAndAdd(gl_matrix_1.vec3.create(), focalPoint, this.dirVec, -distanceToCanvasCenter * k);
            }
            const imageData = viewport.getImageData();
            let spacing = [1, 1, 1];
            if (imageData) {
                spacing = imageData.spacing;
            }
            const { minZoomScale, maxZoomScale } = this.configuration;
            const t = element.clientHeight * spacing[1] * 0.5;
            const scale = t / parallelScaleToSet;
            let cappedParallelScale = parallelScaleToSet;
            let thresholdExceeded = false;
            if (imageData) {
                if (scale < minZoomScale) {
                    cappedParallelScale = t / minZoomScale;
                    thresholdExceeded = true;
                }
                else if (scale >= maxZoomScale) {
                    cappedParallelScale = t / maxZoomScale;
                    thresholdExceeded = true;
                }
            }
            viewport.setCamera({
                parallelScale: cappedParallelScale,
                focalPoint: thresholdExceeded ? focalPoint : focalPointToSet,
                position: thresholdExceeded ? position : positionToSet,
            });
        };
        this._dragPerspectiveProjection = (evt, viewport, camera, pinch = false) => {
            const { element, deltaPoints } = evt.detail;
            const deltaY = pinch
                ? evt.detail.deltaDistance.canvas
                : deltaPoints.canvas[1];
            const size = [element.clientWidth, element.clientHeight];
            const { position, focalPoint, viewPlaneNormal } = camera;
            const distance = Math_1.default.distance2BetweenPoints(position, focalPoint);
            const zoomScale = Math.sqrt(distance) / size[1];
            const directionOfProjection = [
                -viewPlaneNormal[0],
                -viewPlaneNormal[1],
                -viewPlaneNormal[2],
            ];
            const k = this.configuration.invert
                ? deltaY / zoomScale
                : deltaY * zoomScale;
            let tmp = k * directionOfProjection[0];
            position[0] += tmp;
            focalPoint[0] += tmp;
            tmp = k * directionOfProjection[1];
            position[1] += tmp;
            focalPoint[1] += tmp;
            tmp = k * directionOfProjection[2];
            position[2] += tmp;
            focalPoint[2] += tmp;
            viewport.setCamera({ position, focalPoint });
        };
        this.initialMousePosWorld = [0, 0, 0];
        this.dirVec = [0, 0, 0];
        if (this.configuration.pinchToZoom) {
            this.touchDragCallback = this._pinchCallback.bind(this);
        }
        else {
            this.touchDragCallback = this._dragCallback.bind(this);
        }
        this.mouseDragCallback = this._dragCallback.bind(this);
    }
    _pinchCallback(evt) {
        const pointsList = evt.detail
            .currentPointsList;
        if (pointsList.length > 1) {
            const { element, currentPoints } = evt.detail;
            const enabledElement = (0, core_1.getEnabledElement)(element);
            const { viewport } = enabledElement;
            const camera = viewport.getCamera();
            const worldPos = currentPoints.world;
            const { focalPoint } = camera;
            this.initialMousePosWorld = worldPos;
            let dirVec = gl_matrix_1.vec3.fromValues(focalPoint[0] - worldPos[0], focalPoint[1] - worldPos[1], focalPoint[2] - worldPos[2]);
            dirVec = gl_matrix_1.vec3.normalize(gl_matrix_1.vec3.create(), dirVec);
            this.dirVec = dirVec;
            if (camera.parallelProjection) {
                this._dragParallelProjection(evt, viewport, camera, true);
            }
            else {
                this._dragPerspectiveProjection(evt, viewport, camera, true);
            }
            viewport.render();
        }
        if (this.configuration.pan) {
            this._panCallback(evt);
        }
    }
    _dragCallback(evt) {
        const { element } = evt.detail;
        const enabledElement = (0, core_1.getEnabledElement)(element);
        const { viewport } = enabledElement;
        const camera = viewport.getCamera();
        if (camera.parallelProjection) {
            this._dragParallelProjection(evt, viewport, camera);
        }
        else {
            this._dragPerspectiveProjection(evt, viewport, camera);
        }
        viewport.render();
    }
    _panCallback(evt) {
        const { element, deltaPoints } = evt.detail;
        const enabledElement = (0, core_1.getEnabledElement)(element);
        const deltaPointsWorld = deltaPoints.world;
        const camera = enabledElement.viewport.getCamera();
        const { focalPoint, position } = camera;
        const updatedPosition = [
            position[0] - deltaPointsWorld[0],
            position[1] - deltaPointsWorld[1],
            position[2] - deltaPointsWorld[2],
        ];
        const updatedFocalPoint = [
            focalPoint[0] - deltaPointsWorld[0],
            focalPoint[1] - deltaPointsWorld[1],
            focalPoint[2] - deltaPointsWorld[2],
        ];
        enabledElement.viewport.setCamera({
            focalPoint: updatedFocalPoint,
            position: updatedPosition,
        });
        enabledElement.viewport.render();
    }
}
ZoomTool.toolName = 'Zoom';
exports.default = ZoomTool;
//# sourceMappingURL=ZoomTool.js.map