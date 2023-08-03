"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function distanceToPoint(p1, p2) {
    if ((p1 === null || p1 === void 0 ? void 0 : p1.length) !== 2 || (p2 === null || p2 === void 0 ? void 0 : p2.length) !== 2) {
        throw Error('points should have 2 elements of [x, y]');
    }
    const [x1, y1] = p1;
    const [x2, y2] = p2;
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}
exports.default = distanceToPoint;
//# sourceMappingURL=distanceToPoint.js.map