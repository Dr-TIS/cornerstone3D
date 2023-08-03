"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._setNewAttributesIfValid = void 0;
function _setNewAttributesIfValid(attributes, svgNode) {
    Object.keys(attributes).forEach((key) => {
        const newValue = attributes[key];
        if (newValue !== undefined && newValue !== '') {
            svgNode.setAttribute(key, newValue);
        }
    });
}
exports._setNewAttributesIfValid = _setNewAttributesIfValid;
exports.default = _setNewAttributesIfValid;
//# sourceMappingURL=_setNewAttributesIfValid.js.map