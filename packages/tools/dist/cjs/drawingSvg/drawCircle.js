"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const _getHash_1 = __importDefault(require("./_getHash"));
const _setAttributesIfNecessary_1 = __importDefault(require("./_setAttributesIfNecessary"));
const _setNewAttributesIfValid_1 = __importDefault(require("./_setNewAttributesIfValid"));
function drawCircle(svgDrawingHelper, annotationUID, circleUID, center, radius, options = {}, dataId = '') {
    const { color, fill, width, lineWidth, lineDash } = Object.assign({
        color: 'dodgerblue',
        fill: 'transparent',
        width: '2',
        lineDash: undefined,
        lineWidth: undefined,
    }, options);
    const strokeWidth = lineWidth || width;
    const svgns = 'http://www.w3.org/2000/svg';
    const svgNodeHash = (0, _getHash_1.default)(annotationUID, 'circle', circleUID);
    const existingCircleElement = svgDrawingHelper.getSvgNode(svgNodeHash);
    const attributes = {
        cx: `${center[0]}`,
        cy: `${center[1]}`,
        r: `${radius}`,
        stroke: color,
        fill,
        'stroke-width': strokeWidth,
        'stroke-dasharray': lineDash,
    };
    if (existingCircleElement) {
        (0, _setAttributesIfNecessary_1.default)(attributes, existingCircleElement);
        svgDrawingHelper.setNodeTouched(svgNodeHash);
    }
    else {
        const newCircleElement = document.createElementNS(svgns, 'circle');
        if (dataId !== '') {
            newCircleElement.setAttribute('data-id', dataId);
        }
        (0, _setNewAttributesIfValid_1.default)(attributes, newCircleElement);
        svgDrawingHelper.appendNode(newCircleElement, svgNodeHash);
    }
}
exports.default = drawCircle;
//# sourceMappingURL=drawCircle.js.map