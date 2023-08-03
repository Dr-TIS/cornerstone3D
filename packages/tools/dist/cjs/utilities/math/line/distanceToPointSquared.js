"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function dist2(p1, p2) {
    return (p1[0] - p2[0]) * (p1[0] - p2[0]) + (p1[1] - p2[1]) * (p1[1] - p2[1]);
}
function distanceToPointSquared(lineStart, lineEnd, point) {
    const d2 = dist2(lineStart, lineEnd);
    if (d2 === 0) {
        return dist2(point, lineStart);
    }
    const t = ((point[0] - lineStart[0]) * (lineEnd[0] - lineStart[0]) +
        (point[1] - lineStart[1]) * (lineEnd[1] - lineStart[1])) /
        d2;
    if (t < 0) {
        return dist2(point, lineStart);
    }
    if (t > 1) {
        return dist2(point, lineEnd);
    }
    const pt = [
        lineStart[0] + t * (lineEnd[0] - lineStart[0]),
        lineStart[1] + t * (lineEnd[1] - lineStart[1]),
    ];
    return dist2(point, pt);
}
exports.default = distanceToPointSquared;
//# sourceMappingURL=distanceToPointSquared.js.map