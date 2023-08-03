"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gl_matrix_1 = require("gl-matrix");
function pointInShapeCallback(imageData, pointInShapeFn, callback, boundsIJK) {
    let iMin, iMax, jMin, jMax, kMin, kMax;
    let scalarData;
    if (imageData.getScalarData) {
        scalarData = imageData.getScalarData();
    }
    else {
        scalarData = imageData
            .getPointData()
            .getScalars()
            .getData();
    }
    const dimensions = imageData.getDimensions();
    if (!boundsIJK) {
        iMin = 0;
        iMax = dimensions[0];
        jMin = 0;
        jMax = dimensions[1];
        kMin = 0;
        kMax = dimensions[2];
    }
    else {
        [[iMin, iMax], [jMin, jMax], [kMin, kMax]] = boundsIJK;
    }
    const start = gl_matrix_1.vec3.fromValues(iMin, jMin, kMin);
    const direction = imageData.getDirection();
    const rowCosines = direction.slice(0, 3);
    const columnCosines = direction.slice(3, 6);
    const scanAxisNormal = direction.slice(6, 9);
    const spacing = imageData.getSpacing();
    const [rowSpacing, columnSpacing, scanAxisSpacing] = spacing;
    const worldPosStart = imageData.indexToWorld(start);
    const rowStep = gl_matrix_1.vec3.fromValues(rowCosines[0] * rowSpacing, rowCosines[1] * rowSpacing, rowCosines[2] * rowSpacing);
    const columnStep = gl_matrix_1.vec3.fromValues(columnCosines[0] * columnSpacing, columnCosines[1] * columnSpacing, columnCosines[2] * columnSpacing);
    const scanAxisStep = gl_matrix_1.vec3.fromValues(scanAxisNormal[0] * scanAxisSpacing, scanAxisNormal[1] * scanAxisSpacing, scanAxisNormal[2] * scanAxisSpacing);
    const yMultiple = dimensions[0];
    const zMultiple = dimensions[0] * dimensions[1];
    for (let k = kMin; k <= kMax; k++) {
        for (let j = jMin; j <= jMax; j++) {
            for (let i = iMin; i <= iMax; i++) {
                const pointIJK = [i, j, k];
                const dI = i - iMin;
                const dJ = j - jMin;
                const dK = k - kMin;
                const startWorld = worldPosStart;
                const pointLPS = [
                    startWorld[0] +
                        dI * rowStep[0] +
                        dJ * columnStep[0] +
                        dK * scanAxisStep[0],
                    startWorld[1] +
                        dI * rowStep[1] +
                        dJ * columnStep[1] +
                        dK * scanAxisStep[1],
                    startWorld[2] +
                        dI * rowStep[2] +
                        dJ * columnStep[2] +
                        dK * scanAxisStep[2],
                ];
                if (pointInShapeFn(pointLPS, pointIJK)) {
                    const index = k * zMultiple + j * yMultiple + i;
                    const value = scalarData[index];
                    callback({ value, index, pointIJK, pointLPS });
                }
            }
        }
    }
}
exports.default = pointInShapeCallback;
//# sourceMappingURL=pointInShapeCallback.js.map