"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function scaleArray(array, scalingParameters) {
    const arrayLength = array.length;
    const { rescaleSlope, rescaleIntercept, suvbw } = scalingParameters;
    if (scalingParameters.modality === 'PT' && typeof suvbw === 'number') {
        for (let i = 0; i < arrayLength; i++) {
            array[i] = suvbw * (array[i] * rescaleSlope + rescaleIntercept);
        }
    }
    else {
        for (let i = 0; i < arrayLength; i++) {
            array[i] = array[i] * rescaleSlope + rescaleIntercept;
        }
    }
    return array;
}
exports.default = scaleArray;
//# sourceMappingURL=scaleArray.js.map