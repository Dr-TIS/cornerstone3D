import _getHash from './_getHash';
import _setAttributesIfNecessary from './_setAttributesIfNecessary';
import _setNewAttributesIfValid from './_setNewAttributesIfValid';
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
    const svgNodeHash = _getHash(annotationUID, 'circle', circleUID);
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
        _setAttributesIfNecessary(attributes, existingCircleElement);
        svgDrawingHelper.setNodeTouched(svgNodeHash);
    }
    else {
        const newCircleElement = document.createElementNS(svgns, 'circle');
        if (dataId !== '') {
            newCircleElement.setAttribute('data-id', dataId);
        }
        _setNewAttributesIfValid(attributes, newCircleElement);
        svgDrawingHelper.appendNode(newCircleElement, svgNodeHash);
    }
}
export default drawCircle;
//# sourceMappingURL=drawCircle.js.map