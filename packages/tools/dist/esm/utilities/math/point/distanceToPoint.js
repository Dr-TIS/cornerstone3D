export default function distanceToPoint(p1, p2) {
    if (p1?.length !== 2 || p2?.length !== 2) {
        throw Error('points should have 2 elements of [x, y]');
    }
    const [x1, y1] = p1;
    const [x2, y2] = p2;
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}
//# sourceMappingURL=distanceToPoint.js.map