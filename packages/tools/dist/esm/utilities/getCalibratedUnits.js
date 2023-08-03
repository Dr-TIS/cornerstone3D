import { Enums } from '@cornerstonejs/core';
const { CalibrationTypes } = Enums;
const PIXEL_UNITS = 'px';
const getCalibratedLengthUnits = (handles, image) => {
    const { calibration, hasPixelSpacing } = image;
    const units = hasPixelSpacing ? 'mm' : PIXEL_UNITS;
    if (!calibration || !calibration.type)
        return units;
    if (calibration.type === CalibrationTypes.UNCALIBRATED)
        return PIXEL_UNITS;
    if (calibration.SequenceOfUltrasoundRegions)
        return 'US Region';
    return `${units} ${calibration.type}`;
};
const SQUARE = '\xb2';
const getCalibratedAreaUnits = (handles, image) => {
    const { calibration, hasPixelSpacing } = image;
    const units = (hasPixelSpacing ? 'mm' : PIXEL_UNITS) + SQUARE;
    if (!calibration || !calibration.type)
        return units;
    if (calibration.SequenceOfUltrasoundRegions)
        return 'US Region';
    return `${units} ${calibration.type}`;
};
const getCalibratedScale = (image) => image.calibration?.scale || 1;
const getCalibratedAspect = (image) => image.calibration?.aspect || 1;
export default getCalibratedLengthUnits;
export { getCalibratedAreaUnits, getCalibratedLengthUnits, getCalibratedScale, getCalibratedAspect, };
//# sourceMappingURL=getCalibratedUnits.js.map