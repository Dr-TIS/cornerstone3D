"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eraseInsideSphere = void 0;
const fillSphere_1 = require("./fillSphere");
function eraseInsideSphere(enabledElement, operationData) {
    const eraseOperationData = Object.assign({}, operationData, {
        segmentIndex: 0,
    });
    (0, fillSphere_1.fillInsideSphere)(enabledElement, eraseOperationData);
}
exports.eraseInsideSphere = eraseInsideSphere;
//# sourceMappingURL=eraseSphere.js.map