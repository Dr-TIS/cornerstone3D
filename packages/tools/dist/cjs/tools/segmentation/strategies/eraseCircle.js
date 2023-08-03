"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eraseInsideCircle = void 0;
const fillCircle_1 = require("./fillCircle");
function eraseInsideCircle(enabledElement, operationData) {
    const eraseOperationData = Object.assign(Object.assign({}, operationData), { segmentIndex: 0 });
    (0, fillCircle_1.fillInsideCircle)(enabledElement, eraseOperationData);
}
exports.eraseInsideCircle = eraseInsideCircle;
//# sourceMappingURL=eraseCircle.js.map