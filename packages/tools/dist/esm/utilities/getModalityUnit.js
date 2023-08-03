import { metaData } from '@cornerstonejs/core';
function getModalityUnit(modality, imageId, options) {
    if (modality === 'CT') {
        return 'HU';
    }
    else if (modality === 'PT') {
        return _handlePTModality(imageId, options);
    }
    else {
        return '';
    }
}
function _handlePTModality(imageId, options) {
    if (!options.isPreScaled) {
        return 'raw';
    }
    if (options.isSuvScaled) {
        return 'SUV';
    }
    const petSeriesModule = metaData.get('petSeriesModule', imageId);
    return petSeriesModule?.units || 'unitless';
}
export { getModalityUnit };
//# sourceMappingURL=getModalityUnit.js.map