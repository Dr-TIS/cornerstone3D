import { Types } from '@cornerstonejs/core';
import BaseStreamingImageVolume from './BaseStreamingImageVolume';
export default class StreamingImageVolume extends BaseStreamingImageVolume {
    constructor(imageVolumeProperties: Types.IVolume, streamingProperties: Types.IStreamingVolumeProperties);
    getScalarData(): Types.VolumeScalarData;
    getImageLoadRequests: (priority: number) => {
        callLoadImage: (imageId: any, imageIdIndex: any, options: any) => Promise<void>;
        imageId: string;
        imageIdIndex: number;
        options: {
            targetBuffer: {
                arrayBuffer: SharedArrayBuffer;
                offset: number;
                length: number;
                type: any;
            };
            skipCreateImage: boolean;
            preScale: {
                enabled: boolean;
                scalingParameters: Types.ScalingParameters;
            };
        };
        priority: number;
        requestType: import("packages/core/dist/esm/enums/RequestType").default;
        additionalDetails: {
            volumeId: string;
        };
    }[];
}
