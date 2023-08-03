import { vec3 } from 'gl-matrix';
import { getRenderingEngine, metaData, utilities, } from '@cornerstonejs/core';
import { jumpToSlice } from '../../utilities';
import areViewportsCoplanar from './areViewportsCoplanar ';
export default async function stackImageSyncCallback(synchronizerInstance, sourceViewport, targetViewport) {
    const renderingEngine = getRenderingEngine(targetViewport.renderingEngineId);
    if (!renderingEngine) {
        throw new Error(`No RenderingEngine for Id: ${targetViewport.renderingEngineId}`);
    }
    const sViewport = renderingEngine.getViewport(sourceViewport.viewportId);
    const tViewport = renderingEngine.getViewport(targetViewport.viewportId);
    const frameOfReferenceUID1 = sViewport.getFrameOfReferenceUID();
    const frameOfReferenceUID2 = tViewport.getFrameOfReferenceUID();
    const imageId1 = sViewport.getCurrentImageId();
    const imagePlaneModule1 = metaData.get('imagePlaneModule', imageId1);
    const sourceImagePositionPatient = imagePlaneModule1.imagePositionPatient;
    const targetImageIds = tViewport.getImageIds();
    if (!areViewportsCoplanar(sViewport, tViewport)) {
        return;
    }
    if (frameOfReferenceUID1 === frameOfReferenceUID2) {
        const closestImageIdIndex = _getClosestImageIdIndex(sourceImagePositionPatient, targetImageIds);
        if (closestImageIdIndex.index !== -1 &&
            tViewport.getCurrentImageIdIndex() !== closestImageIdIndex.index) {
            await jumpToSlice(tViewport.element, {
                imageIndex: closestImageIdIndex.index,
            });
            return;
        }
    }
    else {
        const registrationMatrixMat4 = utilities.spatialRegistrationMetadataProvider.get('spatialRegistrationModule', [targetViewport.viewportId, sourceViewport.viewportId]);
        if (!registrationMatrixMat4) {
            throw new Error(`No registration matrix found for sourceViewport: ${sourceViewport.viewportId} and targetViewport: ${targetViewport.viewportId}, viewports with different frameOfReferenceUIDs must have a registration matrix in the registrationMetadataProvider. Use calculateViewportsRegistrationMatrix to calculate the matrix.`);
        }
        const targetImagePositionPatientWithRegistrationMatrix = vec3.transformMat4(vec3.create(), sourceImagePositionPatient, registrationMatrixMat4);
        const closestImageIdIndex2 = _getClosestImageIdIndex(targetImagePositionPatientWithRegistrationMatrix, targetImageIds);
        if (closestImageIdIndex2.index !== -1 &&
            tViewport.getCurrentImageIdIndex() !== closestImageIdIndex2.index) {
            await jumpToSlice(tViewport.element, {
                imageIndex: closestImageIdIndex2.index,
            });
        }
    }
}
function _getClosestImageIdIndex(targetPoint, imageIds) {
    return imageIds.reduce((closestImageIdIndex, imageId, index) => {
        const { imagePositionPatient } = metaData.get('imagePlaneModule', imageId);
        const distance = vec3.distance(imagePositionPatient, targetPoint);
        if (distance < closestImageIdIndex.distance) {
            return {
                distance,
                index,
            };
        }
        return closestImageIdIndex;
    }, {
        distance: Infinity,
        index: -1,
    });
}
//# sourceMappingURL=stackImageSyncCallback.js.map