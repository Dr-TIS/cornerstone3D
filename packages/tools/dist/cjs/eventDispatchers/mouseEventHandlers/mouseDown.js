"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const store_1 = require("../../store");
const enums_1 = require("../../enums");
const annotationSelection_1 = require("../../stateManagement/annotation/annotationSelection");
const annotationLocking_1 = require("../../stateManagement/annotation/annotationLocking");
const annotationVisibility_1 = require("../../stateManagement/annotation/annotationVisibility");
const filterToolsWithMoveableHandles_1 = __importDefault(require("../../store/filterToolsWithMoveableHandles"));
const filterToolsWithAnnotationsForElement_1 = __importDefault(require("../../store/filterToolsWithAnnotationsForElement"));
const filterMoveableAnnotationTools_1 = __importDefault(require("../../store/filterMoveableAnnotationTools"));
const getActiveToolForMouseEvent_1 = __importDefault(require("../shared/getActiveToolForMouseEvent"));
const getToolsWithModesForMouseEvent_1 = __importDefault(require("../shared/getToolsWithModesForMouseEvent"));
const { Active, Passive } = enums_1.ToolModes;
function mouseDown(evt) {
    if (store_1.state.isInteractingWithTool) {
        return;
    }
    const activeTool = (0, getActiveToolForMouseEvent_1.default)(evt);
    if (activeTool && typeof activeTool.preMouseDownCallback === 'function') {
        const consumedEvent = activeTool.preMouseDownCallback(evt);
        if (consumedEvent) {
            return;
        }
    }
    const isPrimaryClick = evt.detail.event.buttons === 1;
    const activeToolsWithEventBinding = (0, getToolsWithModesForMouseEvent_1.default)(evt, [Active], evt.detail.event.buttons);
    const passiveToolsIfEventWasPrimaryMouseButton = isPrimaryClick
        ? (0, getToolsWithModesForMouseEvent_1.default)(evt, [Passive])
        : undefined;
    const applicableTools = [
        ...(activeToolsWithEventBinding || []),
        ...(passiveToolsIfEventWasPrimaryMouseButton || []),
    ];
    const eventDetail = evt.detail;
    const { element } = eventDetail;
    const annotationToolsWithAnnotations = (0, filterToolsWithAnnotationsForElement_1.default)(element, applicableTools);
    const canvasCoords = eventDetail.currentPoints.canvas;
    const annotationToolsWithMoveableHandles = (0, filterToolsWithMoveableHandles_1.default)(element, annotationToolsWithAnnotations, canvasCoords, 'mouse');
    const isMultiSelect = !!evt.detail.event.shiftKey;
    if (annotationToolsWithMoveableHandles.length > 0) {
        const { tool, annotation, handle } = getAnnotationForSelection(annotationToolsWithMoveableHandles);
        toggleAnnotationSelection(annotation.annotationUID, isMultiSelect);
        tool.handleSelectedCallback(evt, annotation, handle, 'Mouse');
        return;
    }
    const moveableAnnotationTools = (0, filterMoveableAnnotationTools_1.default)(element, annotationToolsWithAnnotations, canvasCoords, 'mouse');
    if (moveableAnnotationTools.length > 0) {
        const { tool, annotation } = getAnnotationForSelection(moveableAnnotationTools);
        toggleAnnotationSelection(annotation.annotationUID, isMultiSelect);
        tool.toolSelectedCallback(evt, annotation, 'Mouse');
        return;
    }
    if (activeTool && typeof activeTool.postMouseDownCallback === 'function') {
        const consumedEvent = activeTool.postMouseDownCallback(evt);
        if (consumedEvent) {
            return;
        }
    }
}
exports.default = mouseDown;
function getAnnotationForSelection(toolsWithMovableHandles) {
    return ((toolsWithMovableHandles.length > 1 &&
        toolsWithMovableHandles.find((item) => !(0, annotationLocking_1.isAnnotationLocked)(item.annotation) &&
            (0, annotationVisibility_1.isAnnotationVisible)(item.annotation.annotationUID))) ||
        toolsWithMovableHandles[0]);
}
function toggleAnnotationSelection(annotationUID, isMultiSelect = false) {
    if (isMultiSelect) {
        if ((0, annotationSelection_1.isAnnotationSelected)(annotationUID)) {
            (0, annotationSelection_1.setAnnotationSelected)(annotationUID, false);
        }
        else {
            const preserveSelected = true;
            (0, annotationSelection_1.setAnnotationSelected)(annotationUID, true, preserveSelected);
        }
    }
    else {
        const preserveSelected = false;
        (0, annotationSelection_1.setAnnotationSelected)(annotationUID, true, preserveSelected);
    }
}
//# sourceMappingURL=mouseDown.js.map