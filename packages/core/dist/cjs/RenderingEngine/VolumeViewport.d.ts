import { BlendModes, OrientationAxis } from '../enums';
import type { IVolumeInput } from '../types';
import type { ViewportInput } from '../types/IViewport';
import BaseVolumeViewport from './BaseVolumeViewport';
declare class VolumeViewport extends BaseVolumeViewport {
    private _useAcquisitionPlaneForViewPlane;
    constructor(props: ViewportInput);
    setVolumes(volumeInputArray: Array<IVolumeInput>, immediate?: boolean, suppressEvents?: boolean): Promise<void>;
    addVolumes(volumeInputArray: Array<IVolumeInput>, immediate?: boolean, suppressEvents?: boolean): Promise<void>;
    setOrientation(orientation: OrientationAxis, immediate?: boolean): void;
    private _getAcquisitionPlaneOrientation;
    private _setViewPlaneToAcquisitionPlane;
    setBlendMode(blendMode: BlendModes, filterActorUIDs?: any[], immediate?: boolean): void;
    resetCamera(resetPan?: boolean, resetZoom?: boolean, resetToCenter?: boolean): boolean;
    setSlabThickness(slabThickness: number, filterActorUIDs?: any[]): void;
    getCurrentImageIdIndex: () => number | undefined;
    getCurrentImageId: () => string | undefined;
    getRotation: () => number;
}
export default VolumeViewport;
