import { cache, utilities, Enums } from '@cornerstonejs/core';
import { vec3 } from 'gl-matrix';
import makeVolumeMetadata from './makeVolumeMetadata';
import sortImageIdsAndGetSpacing from './sortImageIdsAndGetSpacing';
const { createUint8SharedArray, createFloat32SharedArray } = utilities;
function getVolumeInfo(imageIds) {
    const volumeMetadata = makeVolumeMetadata(imageIds);
    const { BitsAllocated, PixelRepresentation, PhotometricInterpretation, ImageOrientationPatient, PixelSpacing, Columns, Rows, } = volumeMetadata;
    const rowCosineVec = vec3.fromValues(ImageOrientationPatient[0], ImageOrientationPatient[1], ImageOrientationPatient[2]);
    const colCosineVec = vec3.fromValues(ImageOrientationPatient[3], ImageOrientationPatient[4], ImageOrientationPatient[5]);
    const scanAxisNormal = vec3.create();
    vec3.cross(scanAxisNormal, rowCosineVec, colCosineVec);
    const { zSpacing, origin, sortedImageIds } = sortImageIdsAndGetSpacing(imageIds, scanAxisNormal);
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
    const isCacheable = cache.isCacheable(sizeInBytes);
    if (!isCacheable) {
        throw new Error(Enums.Events.CACHE_SIZE_EXCEEDED);
    }
    cache.decacheIfNecessaryUntilBytesAvailable(sizeInBytes);
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
export { getVolumeInfo, getVolumeInfo as default };
//# sourceMappingURL=getVolumeInfo.js.map