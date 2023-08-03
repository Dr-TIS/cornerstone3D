"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const _getHash_1 = __importDefault(require("./_getHash"));
const _setAttributesIfNecessary_1 = __importDefault(require("./_setAttributesIfNecessary"));
const _setNewAttributesIfValid_1 = __importDefault(require("./_setNewAttributesIfValid"));
function drawEllipse(svgDrawingHelper, annotationUID, ellipseUID, corner1, corner2, options = {}, dataId = '') {
    const { color, width, lineWidth, lineDash } = Object.assign({
        color: 'dodgerblue',
        width: '2',
        lineWidth: undefined,
        lineDash: undefined,
    }, options);
    const strokeWidth = lineWidth || width;
    const svgns = 'http://www.w3.org/2000/svg';
    const svgNodeHash = (0, _getHash_1.default)(annotationUID, 'ellipse', ellipseUID);
    const existingEllipse = svgDrawingHelper.getSvgNode(svgNodeHash);
    const w = Math.abs(corner1[0] - corner2[0]);
    const h = Math.abs(corner1[1] - corner2[1]);
    const xMin = Math.min(corner1[0], corner2[0]);
    const yMin = Math.min(corner1[1], corner2[1]);
    const center = [xMin + w / 2, yMin + h / 2];
    const radiusX = w / 2;
    const radiusY = h / 2;
    const attributes = {
        cx: `${center[0]}`,
        cy: `${center[1]}`,
        rx: `${radiusX}`,
        ry: `${radiusY}`,
        stroke: color,
        fill: 'transparent',
        'stroke-width': strokeWidth,
        'stroke-dasharray': lineDash,
    };
    if (existingEllipse) {
        (0, _setAttributesIfNecessary_1.default)(attributes, existingEllipse);
        svgDrawingHelper.setNodeTouched(svgNodeHash);
    }
    else {
        const svgEllipseElement = document.createElementNS(svgns, 'ellipse');
        if (dataId !== '') {
            svgEllipseElement.setAttribute('data-id', dataId);
        }
        (0, _setNewAttributesIfValid_1.default)(attributes, svgEllipseElement);
        svgDrawingHelper.appendNode(svgEllipseElement, svgNodeHash);
    }
}
exports.default = drawEllipse;
//# sourceMappingURL=drawEllipse.js.map