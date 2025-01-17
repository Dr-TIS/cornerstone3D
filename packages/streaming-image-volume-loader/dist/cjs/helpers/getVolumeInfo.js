"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.getVolumeInfo = void 0;
const core_1 = require("@cornerstonejs/core");
const gl_matrix_1 = require("gl-matrix");
const makeVolumeMetadata_1 = __importDefault(require("./makeVolumeMetadata"));
const sortImageIdsAndGetSpacing_1 = __importDefault(require("./sortImageIdsAndGetSpacing"));
const { createUint8SharedArray, createFloat32SharedArray } = core_1.utilities;
function getVolumeInfo(imageIds) {
    const volumeMetadata = (0, makeVolumeMetadata_1.default)(imageIds);
    const { BitsAllocated, PixelRepresentation, PhotometricInterpretation, ImageOrientationPatient, PixelSpacing, Columns, Rows, } = volumeMetadata;
    const rowCosineVec = gl_matrix_1.vec3.fromValues(ImageOrientationPatient[0], ImageOrientationPatient[1], ImageOrientationPatient[2]);
    const colCosineVec = gl_matrix_1.vec3.fromValues(ImageOrientationPatient[3], ImageOrientationPatient[4], ImageOrientationPatient[5]);
    const scanAxisNormal = gl_matrix_1.vec3.create();
    gl_matrix_1.vec3.cross(scanAxisNormal, rowCosineVec, colCosineVec);
    const { zSpacing, origin, sortedImageIds } = (0, sortImageIdsAndGetSpacing_1.default)(imageIds, scanAxisNormal);
    const numFrames = imageIds.length;
    const spacing = [PixelSpacing[1], PixelSpacing[0], zSpacing];
    const dimensions = [Columns, Rows, numFrames];
    const direction = [
        ...rowCosineVec,
        ...colCosineVec,
        ...scanAxisNormal,
    ];
    const signed = PixelRepresentation === 1;
    const bytesPerVoxel = BitsAllocated === 16 ? 4 : 1;
    const sizeInBytesPerComponent = bytesPerVoxel * dimensions[0] * dimensions[1] * dimensions[2];
    let numComponents = 1;
    if (PhotometricInterpretation === 'RGB') {
        numComponents = 3;
    }
    const sizeInBytes = sizeInBytesPerComponent * numComponents;
    const isCacheable = core_1.cache.isCacheable(sizeInBytes);
    if (!isCacheable) {
        throw new Error(core_1.Enums.Events.CACHE_SIZE_EXCEEDED);
    }
    core_1.cache.decacheIfNecessaryUntilBytesAvailable(sizeInBytes);
    let scalarData;
    switch (BitsAllocated) {
        case 8:
            if (signed) {
                throw new Error('8 Bit signed images are not yet supported by this plugin.');
            }
            else {
                scalarData = createUint8SharedArray(dimensions[0] * dimensions[1] * dimensions[2]);
            }
            break;
        case 16:
            scalarData = createFloat32SharedArray(dimensions[0] * dimensions[1] * dimensions[2]);
            break;
        case 24:
            scalarData = createUint8SharedArray(dimensions[0] * dimensions[1] * dimensions[2] * numComponents);
            break;
    }
    return {
        metadata: volumeMetadata,
        sortedImageIds,
        dimensions,
        spacing,
        origin,
        direction,
        scalarData,
        sizeInBytes,
    };
}
exports.getVolumeInfo = getVolumeInfo;
exports.default = getVolumeInfo;
//# sourceMappingURL=getVolumeInfo.js.map