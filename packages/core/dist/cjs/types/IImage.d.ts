import CPUFallbackLUT from './CPUFallbackLUT';
import CPUFallbackColormap from './CPUFallbackColormap';
import CPUFallbackEnabledElement from './CPUFallbackEnabledElement';
import { PixelDataTypedArray } from './PixelDataTypedArray';
interface IImage {
    imageId: string;
    sharedCacheKey?: string;
    isPreScaled?: boolean;
    preScale?: {
        scaled?: boolean;
        scalingParameters?: {
            modality?: string;
            rescaleSlope?: number;
            rescaleIntercept?: number;
            suvbw?: number;
        };
    };
    minPixelValue: number;
    maxPixelValue: number;
    slope: number;
    intercept: number;
    windowCenter: number[] | number;
    windowWidth: number[] | number;
    voiLUTFunction: string;
    getPixelData: () => PixelDataTypedArray;
    getCanvas: () => HTMLCanvasElement;
    rows: number;
    columns: number;
    height: number;
    width: number;
    color: boolean;
    rgba: boolean;
    numComps: number;
    render?: (enabledElement: CPUFallbackEnabledElement, invalidated: boolean) => unknown;
    columnPixelSpacing: number;
    rowPixelSpacing: number;
    sliceThickness?: number;
    invert: boolean;
    photometricInterpretation?: string;
    sizeInBytes: number;
    modalityLUT?: CPUFallbackLUT;
    voiLUT?: CPUFallbackLUT;
    colormap?: CPUFallbackColormap;
    scaling?: {
        PT?: {
            SUVlbmFactor?: number;
            SUVbsaFactor?: number;
            suvbwToSuvlbm?: number;
            suvbwToSuvbsa?: number;
        };
    };
    stats?: {
        lastStoredPixelDataToCanvasImageDataTime?: number;
        lastGetPixelDataTime?: number;
        lastPutImageDataTime?: number;
        lastLutGenerateTime?: number;
        lastRenderedViewport?: unknown;
        lastRenderTime?: number;
    };
    cachedLut?: {
        windowWidth?: number | number[];
        windowCenter?: number | number[];
        invert?: boolean;
        lutArray?: Uint8ClampedArray;
        modalityLUT?: unknown;
        voiLUT?: CPUFallbackLUT;
    };
}
export default IImage;
