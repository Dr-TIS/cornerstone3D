import StreamingImageVolume from './StreamingImageVolume';
interface IVolumeLoader {
    promise: Promise<StreamingImageVolume>;
    cancel: () => void;
    decache: () => void;
}
declare function cornerstoneStreamingImageVolumeLoader(volumeId: string, options: {
    imageIds: string[];
}): IVolumeLoader;
export default cornerstoneStreamingImageVolumeLoader;
