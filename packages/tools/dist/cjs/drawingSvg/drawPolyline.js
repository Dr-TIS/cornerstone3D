"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const _getHash_1 = __importDefault(require("./_getHash"));
const _setNewAttributesIfValid_1 = __importDefault(require("./_setNewAttributesIfValid"));
const _setAttributesIfNecessary_1 = __importDefault(require("./_setAttributesIfNecessary"));
function drawPolyline(svgDrawingHelper, annotationUID, polylineUID, points, options) {
    if (points.length < 2) {
        return;
    }
    const { color, width, lineWidth, lineDash } = Object.assign({
        color: 'dodgerblue',
        width: '2',
        lineWidth: undefined,
        lineDash: undefined,
        connectLastToFirst: false,
    }, options);
    const strokeWidth = lineWidth || width;
    const svgns = 'http://www.w3.org/2000/svg';
    const svgNodeHash = (0, _getHash_1.default)(annotationUID, 'polyline', polylineUID);
    const existingPolyLine = svgDrawingHelper.getSvgNode(svgNodeHash);
    let pointsAttribute = '';
    for (const point of points) {
        pointsAttribute += `${point[0]}, ${point[1]} `;
    }
    if (options.connectLastToFirst) {
        const firstPoint = points[0];
        pointsAttribute += `${firstPoint[0]}, ${firstPoint[1]}`;
    }
    const attributes = {
        points: pointsAttribute,
        stroke: color,
        fill: 'none',
        'stroke-width': strokeWidth,
        'stroke-dasharray': lineDash,
    };
    if (existingPolyLine) {
        (0, _setAttributesIfNecessary_1.default)(attributes, existingPolyLine);
        svgDrawingHelper.setNodeTouched(svgNodeHash);
    }
    else {
        const newPolyLine = document.createElementNS(svgns, 'polyline');
        (0, _setNewAttributesIfValid_1.default)(attributes, newPolyLine);
        svgDrawingHelper.appendNode(newPolyLine, svgNodeHash);
    }
}
exports.default = drawPolyline;
//# sourceMappingURL=drawPolyline.js.map