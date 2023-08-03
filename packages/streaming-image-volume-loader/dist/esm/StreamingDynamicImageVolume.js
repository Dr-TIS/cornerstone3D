import BaseStreamingImageVolume from './BaseStreamingImageVolume';
export default class StreamingDynamicImageVolume extends BaseStreamingImageVolume {
    constructor(imageVolumeProperties, streamingProperties) {
        StreamingDynamicImageVolume._ensureValidData(imageVolumeProperties, streamingProperties);
        super(imageVolumeProperties, streamingProperties);
        this._timePointIndex = 0;
        this._getTimePointRequests = (timePoint, priority) => {
            const { imageIds, scalarData } = timePoint;
            return this.getImageIdsRequests(imageIds, scalarData, priority);
        };
        this._getTimePointsRequests = (priority) => {
            const timePoints = this._getTimePointsToLoad();
            let timePointsRequests = [];
            timePoints.forEach((timePoint) => {
                const timePointRequests = this._getTimePointRequests(timePoint, priority);
                timePointsRequests = timePointsRequests.concat(timePointRequests);
            });
            return timePointsRequests;
        };
        this.getImageLoadRequests = (priority) => {
            return this._getTimePointsRequests(priority).reverse();
        };
        this._numTimePoints = this.scalarData.length;
        this._timePoints = this._getTimePointsData();
    }
    static _ensureValidData(imageVolumeProperties, streamingProperties) {
        const imageIds = streamingProperties.imageIds;
        const scalarDataArrays = (imageVolumeProperties.scalarData);
        if (imageIds.length % scalarDataArrays.length !== 0) {
            throw new Error(`Number of imageIds is not a multiple of ${scalarDataArrays.length}`);
        }
    }
    _getTimePointsData() {
        const { imageIds } = this;
        const scalarData = this.scalarData;
        const { numFrames } = this;
        const numTimePoints = scalarData.length;
        const timePoints = [];
        for (let i = 0; i < numTimePoints; i++) {
            const start = i * numFrames;
            const end = start + numFrames;
            timePoints.push({
                imageIds: imageIds.slice(start, end),
                scalarData: scalarData[i],
            });
        }
        return timePoints;
    }
    _getTimePointsToLoad() {
        const timePoints = this._timePoints;
        const initialTimePointIndex = this._timePointIndex;
        const timePointsToLoad = [timePoints[initialTimePointIndex]];
        let leftIndex = initialTimePointIndex - 1;
        let rightIndex = initialTimePointIndex + 1;
        while (leftIndex >= 0 || rightIndex < timePoints.length) {
            if (leftIndex >= 0) {
                timePointsToLoad.push(timePoints[leftIndex--]);
            }
            if (rightIndex < timePoints.length) {
                timePointsToLoad.push(timePoints[rightIndex++]);
            }
        }
        return timePointsToLoad;
    }
    isDynamicVolume() {
        return true;
    }
    get timePointIndex() {
        return this._timePointIndex;
    }
    set timePointIndex(newTimePointIndex) {
        if (newTimePointIndex < 0 || newTimePointIndex >= this.numTimePoints) {
            throw new Error(`Invalid timePointIndex (${newTimePointIndex})`);
        }
        if (this._timePointIndex === newTimePointIndex) {
            return;
        }
        const { imageData } = this;
        this._timePointIndex = newTimePointIndex;
        imageData.getPointData().setActiveScalars(`timePoint-${newTimePointIndex}`);
        this.invalidateVolume(true);
    }
    get numTimePoints() {
        return this._numTimePoints;
    }
    getScalarData() {
        return this.scalarData[this._timePointIndex];
    }
}
//# sourceMappingURL=StreamingDynamicImageVolume.js.map