"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@cornerstonejs/core");
function addLabelmapToElement(element, volumeId, segmentationRepresentationUID) {
    return __awaiter(this, void 0, void 0, function* () {
        const enabledElement = (0, core_1.getEnabledElement)(element);
        const { renderingEngine, viewport } = enabledElement;
        const { id: viewportId } = viewport;
        const visibility = true;
        const immediateRender = false;
        const suppressEvents = true;
        const volumeInputs = [
            {
                volumeId,
                actorUID: segmentationRepresentationUID,
                visibility,
                blendMode: core_1.Enums.BlendModes.MAXIMUM_INTENSITY_BLEND,
            },
        ];
        yield (0, core_1.addVolumesToViewports)(renderingEngine, volumeInputs, [viewportId], immediateRender, suppressEvents);
    });
}
exports.default = addLabelmapToElement;
//# sourceMappingURL=addLabelmapToElement.js.map