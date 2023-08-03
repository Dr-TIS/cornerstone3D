import { fillInsideSphere } from './fillSphere';
export function eraseInsideSphere(enabledElement, operationData) {
    const eraseOperationData = Object.assign({}, operationData, {
        segmentIndex: 0,
    });
    fillInsideSphere(enabledElement, eraseOperationData);
}
//# sourceMappingURL=eraseSphere.js.map