import { Types, VolumeViewport } from '@cornerstonejs/core';
import { ScrollOptions } from '../types';
export default function scroll(viewport: Types.IStackViewport | Types.IVolumeViewport, options: ScrollOptions): void;
export declare function scrollVolume(viewport: VolumeViewport, volumeId: string, delta: number): void;
