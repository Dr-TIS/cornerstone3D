"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCalibratedAspect = exports.getCalibratedScale = exports.getCalibratedLengthUnits = exports.getCalibratedAreaUnits = void 0;
const core_1 = require("@cornerstonejs/core");
const { CalibrationTypes } = core_1.Enums;
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
exports.getCalibratedLengthUnits = getCalibratedLengthUnits;
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
exports.getCalibratedAreaUnits = getCalibratedAreaUnits;
const getCalibratedScale = (image) => { var _a; return ((_a = image.calibration) === null || _a === void 0 ? void 0 : _a.scale) || 1; };
exports.getCalibratedScale = getCalibratedScale;
const getCalibratedAspect = (image) => { var _a; return ((_a = image.calibration) === null || _a === void 0 ? void 0 : _a.aspect) || 1; };
exports.getCalibratedAspect = getCalibratedAspect;
exports.default = getCalibratedLengthUnits;
//# sourceMappingURL=getCalibratedUnits.js.map