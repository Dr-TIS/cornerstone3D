"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BaseStreamingImageVolume_1 = __importDefault(require("./BaseStreamingImageVolume"));
class StreamingImageVolume extends BaseStreamingImageVolume_1.default {
    constructor(imageVolumeProperties, streamingProperties) {
        super(imageVolumeProperties, streamingProperties);
        this.getImageLoadRequests = (priority) => {
            const { imageIds } = this;
            const scalarData = this.scalarData;
            return this.getImageIdsRequests(imageIds, scalarData, priority);
        };
    }
    getScalarData() {
        return this.scalarData;
    }
}
exports.default = StreamingImageVolume;
//# sourceMappingURL=StreamingImageVolume.js.map