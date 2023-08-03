import getVolumeSliceRangeInfo from './getVolumeSliceRangeInfo';
function getVolumeViewportScrollInfo(viewport, volumeId) {
    const { sliceRange, spacingInNormalDirection, camera } = getVolumeSliceRangeInfo(viewport, volumeId);
    const { min, max, current } = sliceRange;
    const numScrollSteps = Math.round((max - min) / spacingInNormalDirection);
    const fraction = (current - min) / (max - min);
    const floatingStepNumber = fraction * numScrollSteps;
    const currentStepIndex = Math.round(floatingStepNumber);
    return {
        numScrollSteps,
        currentStepIndex,
        sliceRangeInfo: {
            sliceRange,
            spacingInNormalDirection,
            camera,
        },
    };
}
export default getVolumeViewportScrollInfo;
//# sourceMappingURL=getVolumeViewportScrollInfo.js.map