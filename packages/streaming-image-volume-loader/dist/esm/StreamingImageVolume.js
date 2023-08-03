import BaseStreamingImageVolume from './BaseStreamingImageVolume';
export default class StreamingImageVolume extends BaseStreamingImageVolume {
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
//# sourceMappingURL=StreamingImageVolume.js.map