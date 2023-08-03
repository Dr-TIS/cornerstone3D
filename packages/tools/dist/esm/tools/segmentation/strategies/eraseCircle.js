import { fillInsideCircle } from './fillCircle';
export function eraseInsideCircle(enabledElement, operationData) {
    const eraseOperationData = {
        ...operationData,
        segmentIndex: 0,
    };
    fillInsideCircle(enabledElement, eraseOperationData);
}
//# sourceMappingURL=eraseCircle.js.map