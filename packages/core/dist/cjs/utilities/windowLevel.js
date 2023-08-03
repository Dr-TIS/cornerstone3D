"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toLowHighRange = exports.toWindowLevel = void 0;
function toWindowLevel(low, high) {
    const windowWidth = Math.abs(low - high);
    const windowCenter = low + windowWidth / 2;
    return { windowWidth, windowCenter };
}
exports.toWindowLevel = toWindowLevel;
function toLowHighRange(windowWidth, windowCenter) {
    const lower = windowCenter - windowWidth / 2.0;
    const upper = windowCenter + windowWidth / 2.0;
    return { lower, upper };
}
exports.toLowHighRange = toLowHighRange;
//# sourceMappingURL=windowLevel.js.map