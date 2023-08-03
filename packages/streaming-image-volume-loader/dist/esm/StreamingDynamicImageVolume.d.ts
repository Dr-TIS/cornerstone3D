import type { Types } from '@cornerstonejs/core';
import BaseStreamingImageVolume from './BaseStreamingImageVolume';
export default class StreamingDynamicImageVolume extends BaseStreamingImageVolume implements Types.IDynamicImageVolume {
    private _numTimePoints;
    private _timePoints;
    private _timePointIndex;
    constructor(imageVolumeProperties: Types.IVolume, streamingProperties: Types.IStreamingVolumeProperties);
    private static _ensureValidData;
    private _getTimePointsData;
    private _getTimePointsToLoad;
    private _getTimePointRequests;
    private _getTimePointsRequests;
    isDynamicVolume(): boolean;
    get timePointIndex(): number;
    set timePointIndex(newTimePointIndex: number);
    get numTimePoints(): number;
    getScalarData(): Types.VolumeScalarData;
    getImageLoadRequests: (priority: number) => any[];
}
