"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@cornerstonejs/core");
const base_1 = require("../base");
const fillSphere_1 = require("./strategies/fillSphere");
const eraseSphere_1 = require("./strategies/eraseSphere");
const fillCircle_1 = require("./strategies/fillCircle");
const eraseCircle_1 = require("./strategies/eraseCircle");
const enums_1 = require("../../enums");
const drawingSvg_1 = require("../../drawingSvg");
const elementCursor_1 = require("../../cursors/elementCursor");
const triggerAnnotationRenderForViewportIds_1 = __importDefault(require("../../utilities/triggerAnnotationRenderForViewportIds"));
const segmentation_1 = require("../../stateManagement/segmentation");
class BrushTool extends base_1.BaseTool {
    constructor(toolProps = {}, defaultToolProps = {
        supportedInteractionTypes: ['Mouse', 'Touch'],
        configuration: {
            strategies: {
                FILL_INSIDE_CIRCLE: fillCircle_1.fillInsideCircle,
                THRESHOLD_INSIDE_CIRCLE: fillCircle_1.thresholdInsideCircle,
                ERASE_INSIDE_CIRCLE: eraseCircle_1.eraseInsideCircle,
                FILL_INSIDE_SPHERE: fillSphere_1.fillInsideSphere,
                ERASE_INSIDE_SPHERE: eraseSphere_1.eraseInsideSphere,
            },
            strategySpecificConfiguration: {
                THRESHOLD_INSIDE_CIRCLE: {
                    threshold: [-150, -70],
                },
            },
            defaultStrategy: 'FILL_INSIDE_CIRCLE',
            activeStrategy: 'FILL_INSIDE_CIRCLE',
            brushSize: 25,
        },
    }) {
        super(toolProps, defaultToolProps);
        this.onSetToolPassive = () => {
            this.disableCursor();
        };
        this.onSetToolEnabled = () => {
            this.disableCursor();
        };
        this.onSetToolDisabled = () => {
            this.disableCursor();
        };
        this.preMouseDownCallback = (evt) => {
            const eventData = evt.detail;
            const { element } = eventData;
            const enabledElement = (0, core_1.getEnabledElement)(element);
            const { viewport, renderingEngine } = enabledElement;
            if (viewport instanceof core_1.StackViewport) {
                throw new Error('Not implemented yet');
            }
            const toolGroupId = this.toolGroupId;
            const activeSegmentationRepresentation = segmentation_1.activeSegmentation.getActiveSegmentationRepresentation(toolGroupId);
            if (!activeSegmentationRepresentation) {
                throw new Error('No active segmentation detected, create one before using the brush tool');
            }
            const { segmentationId, type } = activeSegmentationRepresentation;
            const segmentsLocked = segmentation_1.segmentLocking.getLockedSegments(segmentationId);
            const { representationData } = segmentation_1.state.getSegmentation(segmentationId);
            const { volumeId } = representationData[type];
            const segmentation = core_1.cache.getVolume(volumeId);
            const actors = viewport.getActors();
            const firstVolumeActorUID = actors[0].uid;
            const imageVolume = core_1.cache.getVolume(firstVolumeActorUID);
            const viewportIdsToRender = [viewport.id];
            this._editData = {
                segmentation,
                imageVolume,
                segmentsLocked,
            };
            this._activateDraw(element);
            (0, elementCursor_1.hideElementCursor)(element);
            evt.preventDefault();
            (0, triggerAnnotationRenderForViewportIds_1.default)(renderingEngine, viewportIdsToRender);
            return true;
        };
        this.mouseMoveCallback = (evt) => {
            if (this.mode === enums_1.ToolModes.Active) {
                this.updateCursor(evt);
            }
        };
        this._dragCallback = (evt) => {
            const eventData = evt.detail;
            const { element } = eventData;
            const enabledElement = (0, core_1.getEnabledElement)(element);
            const { renderingEngine } = enabledElement;
            const { imageVolume, segmentation, segmentsLocked } = this._editData;
            this.updateCursor(evt);
            const { segmentIndex, segmentationId, segmentationRepresentationUID, brushCursor, viewportIdsToRender, } = this._hoverData;
            const { data } = brushCursor;
            const { viewPlaneNormal, viewUp } = brushCursor.metadata;
            (0, triggerAnnotationRenderForViewportIds_1.default)(renderingEngine, viewportIdsToRender);
            const operationData = {
                points: data.handles.points,
                volume: segmentation,
                imageVolume,
                segmentIndex,
                segmentsLocked,
                viewPlaneNormal,
                toolGroupId: this.toolGroupId,
                segmentationId,
                segmentationRepresentationUID,
                viewUp,
                strategySpecificConfiguration: this.configuration.strategySpecificConfiguration,
            };
            this.applyActiveStrategy(enabledElement, operationData);
        };
        this._endCallback = (evt) => {
            const eventData = evt.detail;
            const { element } = eventData;
            const { imageVolume, segmentation, segmentsLocked } = this._editData;
            const { segmentIndex, segmentationId, segmentationRepresentationUID, brushCursor, } = this._hoverData;
            const { data } = brushCursor;
            const { viewPlaneNormal, viewUp } = brushCursor.metadata;
            this._deactivateDraw(element);
            (0, elementCursor_1.resetElementCursor)(element);
            const enabledElement = (0, core_1.getEnabledElement)(element);
            const { viewport } = enabledElement;
            this._editData = null;
            this.updateCursor(evt);
            if (viewport instanceof core_1.StackViewport) {
                throw new Error('Not implemented yet');
            }
            const operationData = {
                points: data.handles.points,
                volume: segmentation,
                imageVolume,
                segmentIndex,
                segmentsLocked,
                viewPlaneNormal,
                toolGroupId: this.toolGroupId,
                segmentationId,
                segmentationRepresentationUID,
                viewUp,
                strategySpecificConfiguration: this.configuration.strategySpecificConfiguration,
            };
            this.applyActiveStrategy(enabledElement, operationData);
        };
        this._activateDraw = (element) => {
            element.addEventListener(enums_1.Events.MOUSE_UP, this._endCallback);
            element.addEventListener(enums_1.Events.MOUSE_DRAG, this._dragCallback);
            element.addEventListener(enums_1.Events.MOUSE_CLICK, this._endCallback);
        };
        this._deactivateDraw = (element) => {
            element.removeEventListener(enums_1.Events.MOUSE_UP, this._endCallback);
            element.removeEventListener(enums_1.Events.MOUSE_DRAG, this._dragCallback);
            element.removeEventListener(enums_1.Events.MOUSE_CLICK, this._endCallback);
        };
    }
    disableCursor() {
        this._hoverData = undefined;
    }
    updateCursor(evt) {
        const eventData = evt.detail;
        const { element } = eventData;
        const { currentPoints } = eventData;
        const centerCanvas = currentPoints.canvas;
        const enabledElement = (0, core_1.getEnabledElement)(element);
        const { renderingEngine, viewport } = enabledElement;
        const camera = viewport.getCamera();
        const { viewPlaneNormal, viewUp } = camera;
        const toolGroupId = this.toolGroupId;
        const activeSegmentationRepresentation = segmentation_1.activeSegmentation.getActiveSegmentationRepresentation(toolGroupId);
        if (!activeSegmentationRepresentation) {
            console.warn('No active segmentation detected, create one before using the brush tool');
            return;
        }
        const { segmentationRepresentationUID, segmentationId } = activeSegmentationRepresentation;
        const segmentIndex = segmentation_1.segmentIndex.getActiveSegmentIndex(segmentationId);
        const segmentColor = segmentation_1.config.color.getColorForSegmentIndex(toolGroupId, segmentationRepresentationUID, segmentIndex);
        const viewportIdsToRender = [viewport.id];
        const brushCursor = {
            metadata: {
                viewPlaneNormal: [...viewPlaneNormal],
                viewUp: [...viewUp],
                FrameOfReferenceUID: viewport.getFrameOfReferenceUID(),
                referencedImageId: '',
                toolName: this.getToolName(),
                segmentColor,
            },
            data: {},
        };
        this._hoverData = {
            brushCursor,
            centerCanvas,
            segmentIndex,
            segmentationId,
            segmentationRepresentationUID,
            segmentColor,
            viewportIdsToRender,
        };
        this._calculateCursor(element, centerCanvas);
        (0, triggerAnnotationRenderForViewportIds_1.default)(renderingEngine, viewportIdsToRender);
    }
    _calculateCursor(element, centerCanvas) {
        const enabledElement = (0, core_1.getEnabledElement)(element);
        const { viewport } = enabledElement;
        const { canvasToWorld } = viewport;
        const { brushSize } = this.configuration;
        const radius = brushSize;
        const bottomCanvas = [
            centerCanvas[0],
            centerCanvas[1] + radius,
        ];
        const topCanvas = [centerCanvas[0], centerCanvas[1] - radius];
        const leftCanvas = [
            centerCanvas[0] - radius,
            centerCanvas[1],
        ];
        const rightCanvas = [
            centerCanvas[0] + radius,
            centerCanvas[1],
        ];
        const { brushCursor } = this._hoverData;
        const { data } = brushCursor;
        if (data.handles === undefined) {
            data.handles = {};
        }
        data.handles.points = [
            canvasToWorld(bottomCanvas),
            canvasToWorld(topCanvas),
            canvasToWorld(leftCanvas),
            canvasToWorld(rightCanvas),
        ];
        data.invalidated = false;
    }
    invalidateBrushCursor() {
        if (this._hoverData !== undefined) {
            const { data } = this._hoverData.brushCursor;
            data.invalidated = true;
        }
    }
    renderAnnotation(enabledElement, svgDrawingHelper) {
        if (!this._hoverData) {
            return;
        }
        const { viewport } = enabledElement;
        const viewportIdsToRender = this._hoverData.viewportIdsToRender;
        if (!viewportIdsToRender.includes(viewport.id)) {
            return;
        }
        const brushCursor = this._hoverData.brushCursor;
        if (brushCursor.data.invalidated === true) {
            const { centerCanvas } = this._hoverData;
            const { element } = viewport;
            this._calculateCursor(element, centerCanvas);
        }
        const toolMetadata = brushCursor.metadata;
        const annotationUID = toolMetadata.brushCursorUID;
        const data = brushCursor.data;
        const { points } = data.handles;
        const canvasCoordinates = points.map((p) => viewport.worldToCanvas(p));
        const bottom = canvasCoordinates[0];
        const top = canvasCoordinates[1];
        const center = [
            Math.floor((bottom[0] + top[0]) / 2),
            Math.floor((bottom[1] + top[1]) / 2),
        ];
        const radius = Math.abs(bottom[1] - Math.floor((bottom[1] + top[1]) / 2));
        const color = `rgb(${toolMetadata.segmentColor.slice(0, 3)})`;
        if (!viewport.getRenderingEngine()) {
            console.warn('Rendering Engine has been destroyed');
            return;
        }
        const circleUID = '0';
        (0, drawingSvg_1.drawCircle)(svgDrawingHelper, annotationUID, circleUID, center, radius, {
            color,
        });
    }
}
BrushTool.toolName = 'Brush';
exports.default = BrushTool;
//# sourceMappingURL=BrushTool.js.map