import { utilities, cache } from '@cornerstonejs/core';
function getDataInTime(dynamicVolume, options) {
    let dataInTime;
    const frames = options.frameNumbers || [
        ...Array(dynamicVolume.numTimePoints).keys(),
    ];
    if (!options.maskVolumeId && !options.imageCoordinate) {
        throw new Error('No ROI provided');
    }
    if (options.maskVolumeId && options.imageCoordinate) {
        throw new Error('Please provide only one ROI');
    }
    if (options.maskVolumeId) {
        const segmentationVolume = cache.getVolume(options.maskVolumeId);
        const indexArray = segmentationVolume
            .getScalarData()
            .map((_, i) => i)
            .filter((i) => segmentationVolume.getScalarData()[i] !== 0);
        const dataInTime = _getTimePointDataMask(frames, indexArray, dynamicVolume);
        return dataInTime;
    }
    if (options.imageCoordinate) {
        const dataInTime = _getTimePointDataCoordinate(frames, options.imageCoordinate, dynamicVolume);
        return dataInTime;
    }
    return dataInTime;
}
function _getTimePointDataCoordinate(frames, coordinate, volume) {
    const { dimensions, imageData } = volume;
    const index = imageData.worldToIndex(coordinate);
    index[0] = Math.floor(index[0]);
    index[1] = Math.floor(index[1]);
    index[2] = Math.floor(index[2]);
    if (!utilities.indexWithinDimensions(index, dimensions)) {
        throw new Error('outside bounds');
    }
    const yMultiple = dimensions[0];
    const zMultiple = dimensions[0] * dimensions[1];
    const allScalarData = volume.getScalarDataArrays();
    const value = [];
    frames.forEach((frame) => {
        const activeScalarData = allScalarData[frame];
        const scalarIndex = index[2] * zMultiple + index[1] * yMultiple + index[0];
        value.push(activeScalarData[scalarIndex]);
    });
    return value;
}
function _getTimePointDataMask(frames, indexArray, volume) {
    const allScalarData = volume.getScalarDataArrays();
    const value = [];
    for (let i = 0; i < indexArray.length; i++) {
        const indexValues = [];
        frames.forEach((frame) => {
            const activeScalarData = allScalarData[frame];
            indexValues.push(activeScalarData[indexArray[i]]);
        });
        value.push(indexValues);
    }
    return value;
}
export default getDataInTime;
//# sourceMappingURL=getDataInTime.js.map