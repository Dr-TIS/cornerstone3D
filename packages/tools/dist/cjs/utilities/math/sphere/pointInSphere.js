"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function pointInSphere(sphere, pointLPS) {
    const { center, radius } = sphere;
    return (Math.pow((pointLPS[0] - center[0]), 2) +
        Math.pow((pointLPS[1] - center[1]), 2) +
        Math.pow((pointLPS[2] - center[2]), 2) <=
        Math.pow(radius, 2));
}
exports.default = pointInSphere;
//# sourceMappingURL=pointInSphere.js.map