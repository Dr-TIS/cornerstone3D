import { cache } from '@cornerstonejs/core';
import triggerSegmentationRender from '../../utilities/segmentation/triggerSegmentationRender';
import SegmentationRepresentations from '../../enums/SegmentationRepresentations';
import * as SegmentationState from '../../stateManagement/segmentation/segmentationState';
const onSegmentationDataModified = function (evt) {
    const { segmentationId, modifiedSlicesToUse } = evt.detail;
    const { representationData, type } = SegmentationState.getSegmentation(segmentationId);
    let toolGroupIds;
    if (type === SegmentationRepresentations.Labelmap) {
        const segmentationVolume = cache.getVolume(representationData[type].volumeId);
        if (!segmentationVolume) {
            console.warn('segmentation not found in cache');
            return;
        }
        const { imageData, vtkOpenGLTexture } = segmentationVolume;
        let slicesToUpdate;
        if (modifiedSlicesToUse && Array.isArray(modifiedSlicesToUse)) {
            slicesToUpdate = modifiedSlicesToUse;
        }
        else {
            const numSlices = imageData.getDimensions()[2];
            slicesToUpdate = [...Array(numSlices).keys()];
        }
        slicesToUpdate.forEach((i) => {
            vtkOpenGLTexture.setUpdatedFrame(i);
        });
        imageData.modified();
        toolGroupIds =
            SegmentationState.getToolGroupIdsWithSegmentation(segmentationId);
    }
    else {
        throw new Error(`onSegmentationDataModified: representationType ${type} not supported yet`);
    }
    toolGroupIds.forEach((toolGroupId) => {
        triggerSegmentationRender(toolGroupId);
    });
};
export default onSegmentationDataModified;
//# sourceMappingURL=segmentationDataModifiedEventListener.js.map