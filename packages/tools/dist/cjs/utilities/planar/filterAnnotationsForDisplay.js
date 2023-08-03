"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@cornerstonejs/core");
const filterAnnotationsWithinSlice_1 = __importDefault(require("./filterAnnotationsWithinSlice"));
function filterAnnotationsForDisplay(viewport, annotations) {
    if (viewport instanceof core_1.StackViewport) {
        const imageId = viewport.getCurrentImageId();
        const colonIndex = imageId.indexOf(':');
        const imageURI = imageId.substring(colonIndex + 1);
        return annotations.filter((annotation) => {
            if (!annotation.isVisible) {
                return false;
            }
            const imageId = annotation.metadata.referencedImageId;
            if (imageId === undefined) {
                return false;
            }
            const colonIndex = imageId.indexOf(':');
            const referenceImageURI = imageId.substring(colonIndex + 1);
            return referenceImageURI === imageURI;
        });
    }
    else if (viewport instanceof core_1.VolumeViewport) {
        const camera = viewport.getCamera();
        const { spacingInNormalDirection } = core_1.utilities.getTargetVolumeAndSpacingInNormalDir(viewport, camera);
        return (0, filterAnnotationsWithinSlice_1.default)(annotations, camera, spacingInNormalDirection);
    }
    else {
        throw new Error(`Viewport Type ${viewport.type} not supported`);
    }
}
exports.default = filterAnnotationsForDisplay;
//# sourceMappingURL=filterAnnotationsForDisplay.js.map