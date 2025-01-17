function generateLinearVOILUT(windowWidth, windowCenter) {
    return function (modalityLutValue) {
        return ((modalityLutValue - windowCenter) / windowWidth + 0.5) * 255.0;
    };
}
function generateNonLinearVOILUT(voiLUT) {
    const bitsPerEntry = Math.max(...voiLUT.lut).toString(2).length;
    const shift = bitsPerEntry - 8;
    const minValue = voiLUT.lut[0] >> shift;
    const maxValue = voiLUT.lut[voiLUT.lut.length - 1] >> shift;
    const maxValueMapped = voiLUT.firstValueMapped + voiLUT.lut.length - 1;
    return function (modalityLutValue) {
        if (modalityLutValue < voiLUT.firstValueMapped) {
            return minValue;
        }
        else if (modalityLutValue >= maxValueMapped) {
            return maxValue;
        }
        return voiLUT.lut[modalityLutValue - voiLUT.firstValueMapped] >> shift;
    };
}
export default function (windowWidth, windowCenter, voiLUT) {
    if (voiLUT) {
        return generateNonLinearVOILUT(voiLUT);
    }
    return generateLinearVOILUT(windowWidth, windowCenter);
}
//# sourceMappingURL=getVOILut.js.map