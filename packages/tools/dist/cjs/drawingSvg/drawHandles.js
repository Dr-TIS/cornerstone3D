"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const _getHash_1 = __importDefault(require("./_getHash"));
const _setNewAttributesIfValid_1 = __importDefault(require("./_setNewAttributesIfValid"));
const _setAttributesIfNecessary_1 = __importDefault(require("./_setAttributesIfNecessary"));
function drawHandles(svgDrawingHelper, annotationUID, handleGroupUID, handlePoints, options = {}) {
    const { color, handleRadius, width, lineWidth, fill, type, opacity } = Object.assign({
        color: 'dodgerblue',
        handleRadius: '6',
        width: '2',
        lineWidth: undefined,
        fill: 'transparent',
        type: 'circle',
        opacity: 1,
    }, options);
    const strokeWidth = lineWidth || width;
    for (let i = 0; i < handlePoints.length; i++) {
        const handle = handlePoints[i];
        const svgns = 'http://www.w3.org/2000/svg';
        const svgNodeHash = (0, _getHash_1.default)(annotationUID, 'handle', `hg-${handleGroupUID}-index-${i}`);
        let attributes;
        if (type === 'circle') {
            attributes = {
                cx: `${handle[0]}`,
                cy: `${handle[1]}`,
                r: handleRadius,
                stroke: color,
                fill,
                'stroke-width': strokeWidth,
                opacity: opacity,
            };
        }
        else if (type === 'rect') {
            const handleRadiusFloat = parseFloat(handleRadius);
            const side = handleRadiusFloat * 1.5;
            const x = handle[0] - side * 0.5;
            const y = handle[1] - side * 0.5;
            attributes = {
                x: `${x}`,
                y: `${y}`,
                width: `${side}`,
                height: `${side}`,
                stroke: color,
                fill,
                'stroke-width': strokeWidth,
                rx: `${side * 0.1}`,
                opacity: opacity,
            };
        }
        else {
            throw new Error(`Unsupported handle type: ${type}`);
        }
        const existingHandleElement = svgDrawingHelper.getSvgNode(svgNodeHash);
        if (existingHandleElement) {
            (0, _setAttributesIfNecessary_1.default)(attributes, existingHandleElement);
            svgDrawingHelper.setNodeTouched(svgNodeHash);
        }
        else {
            const newHandleElement = document.createElementNS(svgns, type);
            (0, _setNewAttributesIfValid_1.default)(attributes, newHandleElement);
            svgDrawingHelper.appendNode(newHandleElement, svgNodeHash);
        }
    }
}
exports.default = drawHandles;
//# sourceMappingURL=drawHandles.js.map