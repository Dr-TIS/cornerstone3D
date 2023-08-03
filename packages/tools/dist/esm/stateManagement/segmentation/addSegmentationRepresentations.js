import Representations from '../../enums/SegmentationRepresentations';
import { getToolGroup } from '../../store/ToolGroupManager';
import { labelmapDisplay } from '../../tools/displayTools/Labelmap';
import { contourDisplay } from '../../tools/displayTools/Contour';
async function addSegmentationRepresentations(toolGroupId, representationInputArray, toolGroupSpecificRepresentationConfig) {
    const toolGroup = getToolGroup(toolGroupId);
    if (!toolGroup) {
        throw new Error(`No tool group found for toolGroupId: ${toolGroupId}`);
    }
    const promises = representationInputArray.map((representationInput) => {
        return _addSegmentationRepresentation(toolGroupId, representationInput, toolGroupSpecificRepresentationConfig);
    });
    const segmentationRepresentationUIDs = await Promise.all(promises);
    return segmentationRepresentationUIDs;
}
async function _addSegmentationRepresentation(toolGroupId, representationInput, toolGroupSpecificRepresentationConfig) {
    let segmentationRepresentationUID;
    if (representationInput.type === Representations.Labelmap) {
        segmentationRepresentationUID =
            await labelmapDisplay.addSegmentationRepresentation(toolGroupId, representationInput, toolGroupSpecificRepresentationConfig);
    }
    else if (representationInput.type === Representations.Contour) {
        segmentationRepresentationUID =
            await contourDisplay.addSegmentationRepresentation(toolGroupId, representationInput, toolGroupSpecificRepresentationConfig);
    }
    else {
        throw new Error(`The representation type ${representationInput.type} is not supported`);
    }
    return segmentationRepresentationUID;
}
export default addSegmentationRepresentations;
//# sourceMappingURL=addSegmentationRepresentations.js.map