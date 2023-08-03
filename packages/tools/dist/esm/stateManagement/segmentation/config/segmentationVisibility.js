import { cache } from '@cornerstonejs/core';
import * as SegmentationState from '../../../stateManagement/segmentation/segmentationState';
import { getSegmentationRepresentations } from '../../../stateManagement/segmentation/segmentationState';
import { triggerSegmentationRepresentationModified } from '../triggerSegmentationEvents';
import SegmentationRepresentations from '../../../enums/SegmentationRepresentations';
function getSegmentationIndices(segmentationId) {
    const segmentation = SegmentationState.getSegmentation(segmentationId);
    if (segmentation.type === SegmentationRepresentations.Labelmap) {
        const volume = cache.getVolume(segmentationId);
        const scalarData = volume.getScalarData();
        const keySet = {};
        for (let i = 0; i < scalarData.length; i++) {
            const segmentIndex = scalarData[i];
            if (segmentIndex !== 0 && !keySet[segmentIndex]) {
                keySet[segmentIndex] = true;
            }
        }
        return Object.keys(keySet).map((it) => parseInt(it, 10));
    }
    else if (segmentation.type === SegmentationRepresentations.Contour) {
        const geometryIds = segmentation.representationData.CONTOUR?.geometryIds;
        if (!geometryIds) {
            throw new Error(`No geometryIds found for segmentationId ${segmentationId}`);
        }
        return geometryIds.map((geometryId) => {
            const geometry = cache.getGeometry(geometryId);
            return geometry.data.getSegmentIndex();
        });
    }
}
function setSegmentationVisibility(toolGroupId, segmentationRepresentationUID, visibility) {
    const toolGroupSegmentationRepresentations = getSegmentationRepresentations(toolGroupId);
    if (!toolGroupSegmentationRepresentations) {
        return;
    }
    const representation = toolGroupSegmentationRepresentations.find((representation) => representation.segmentationRepresentationUID ===
        segmentationRepresentationUID);
    if (!representation) {
        return;
    }
    const { segmentsHidden, segmentationId } = representation;
    const indices = getSegmentationIndices(segmentationId);
    if (visibility) {
        segmentsHidden.clear();
    }
    else {
        indices.forEach((index) => {
            segmentsHidden.add(index);
        });
    }
    triggerSegmentationRepresentationModified(toolGroupId, representation.segmentationRepresentationUID);
}
function getSegmentationVisibility(toolGroupId, segmentationRepresentationUID) {
    const toolGroupSegmentationRepresentations = getSegmentationRepresentations(toolGroupId);
    const representation = toolGroupSegmentationRepresentations.find((representation) => representation.segmentationRepresentationUID ===
        segmentationRepresentationUID);
    if (!representation) {
        return;
    }
    const { segmentsHidden } = representation;
    return segmentsHidden.size === 0;
}
function setSegmentsVisibility(toolGroupId, segmentationRepresentationUID, segmentIndices, visibility) {
    const segRepresentation = SegmentationState.getSegmentationRepresentationByUID(toolGroupId, segmentationRepresentationUID);
    if (!segRepresentation) {
        return;
    }
    segmentIndices.forEach((segmentIndex) => {
        visibility
            ? segRepresentation.segmentsHidden.delete(segmentIndex)
            : segRepresentation.segmentsHidden.add(segmentIndex);
    });
    triggerSegmentationRepresentationModified(toolGroupId, segmentationRepresentationUID);
}
function setSegmentVisibility(toolGroupId, segmentationRepresentationUID, segmentIndex, visibility) {
    const segRepresentation = SegmentationState.getSegmentationRepresentationByUID(toolGroupId, segmentationRepresentationUID);
    if (!segRepresentation) {
        return;
    }
    visibility
        ? segRepresentation.segmentsHidden.delete(segmentIndex)
        : segRepresentation.segmentsHidden.add(segmentIndex);
    triggerSegmentationRepresentationModified(toolGroupId, segmentationRepresentationUID);
}
export { setSegmentationVisibility, getSegmentationVisibility, setSegmentVisibility, setSegmentsVisibility, };
//# sourceMappingURL=segmentationVisibility.js.map