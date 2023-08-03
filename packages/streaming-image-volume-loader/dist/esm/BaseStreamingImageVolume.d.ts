import { Enums, ImageVolume } from '@cornerstonejs/core';
import type { Types } from '@cornerstonejs/core';
export default class BaseStreamingImageVolume extends ImageVolume {
    private framesLoaded;
    private framesProcessed;
    protected numFrames: number;
    protected cornerstoneImageMetaData: any;
    loadStatus: {
        loaded: boolean;
        loading: boolean;
        cancelled: boolean;
        cachedFrames: Array<boolean>;
        callbacks: Array<(...args: unknown[]) => void>;
    };
    constructor(imageVolumeProperties: Types.IVolume, streamingProperties: Types.IStreamingVolumeProperties);
    private _getNumFrames;
    private _getScalarDataLength;
    private _createCornerstoneImageMetaData;
    private _imageIdIndexToFrameIndex;
    getScalarDataArrays(): Types.VolumeScalarData[];
    private _getScalarDataByImageIdIndex;
    protected invalidateVolume(immediate: boolean): void;
    cancelLoading: () => void;
    clearLoadCallbacks(): void;
    load: (callback: (...args: unknown[]) => void, priority?: number) => void;
    protected getImageIdsRequests: (imageIds: string[], scalarData: Types.VolumeScalarData, priority: number) => {
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
        requestType: Enums.RequestType;
        additionalDetails: {
            volumeId: string;
        };
    }[];
    private handleImageComingFromCache;
    getImageLoadRequests(_priority: number): any[];
    private _prefetchImageIds;
    private _scaleIfNecessary;
    private _addScalingToVolume;
    private _removeFromCache;
    getCornerstoneImage(imageId: string, imageIdIndex: number): Types.IImage;
    convertToCornerstoneImage(imageId: string, imageIdIndex: number): Types.IImageLoadObject;
    getCornerstoneImageLoadObject(imageId: string, imageIdIndex: number): Types.IImageLoadObject;
    getCornerstoneImages(): Types.IImage[];
    private _convertToImages;
    decache(completelyRemove?: boolean): void;
}
