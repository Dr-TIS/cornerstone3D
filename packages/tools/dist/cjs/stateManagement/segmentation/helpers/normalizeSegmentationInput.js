"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function normalizeSegmentationInput(segmentationInput) {
    const { segmentationId, representation } = segmentationInput;
    return {
        segmentationId,
        cachedStats: {},
        segmentLabels: {},
        label: null,
        segmentsLocked: new Set(),
        type: representation.type,
        activeSegmentIndex: 1,
        representationData: {
            [representation.type]: Object.assign({}, representation.data),
        },
    };
}
exports.default = normalizeSegmentationInput;
//# sourceMappingURL=normalizeSegmentationInput.js.map