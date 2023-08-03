"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._setAttributesIfNecessary = void 0;
function _setAttributesIfNecessary(attributes, svgNode) {
    Object.keys(attributes).forEach((key) => {
        const currentValue = svgNode.getAttribute(key);
        const newValue = attributes[key];
        if (newValue === undefined || newValue === '') {
            svgNode.removeAttribute(key);
        }
        else if (currentValue !== newValue) {
            svgNode.setAttribute(key, newValue);
        }
    });
}
exports._setAttributesIfNecessary = _setAttributesIfNecessary;
exports.default = _setAttributesIfNecessary;
//# sourceMappingURL=_setAttributesIfNecessary.js.map