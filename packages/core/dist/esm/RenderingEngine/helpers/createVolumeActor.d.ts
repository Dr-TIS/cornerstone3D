import { VolumeActor } from './../../types/IActor';
import BlendModes from '../../enums/BlendModes';
interface createVolumeActorInterface {
    volumeId: string;
    callback?: ({ volumeActor, volumeId, }: {
        volumeActor: VolumeActor;
        volumeId: string;
    }) => void;
    blendMode?: BlendModes;
}
declare function createVolumeActor(props: createVolumeActorInterface, element: HTMLDivElement, viewportId: string, suppressEvents?: boolean, use16BitTexture?: boolean): Promise<VolumeActor>;
export default createVolumeActor;
