import { getGPUTier } from 'detect-gpu';
import { SharedArrayBufferModes } from './enums';
import { getRenderingEngines } from './RenderingEngine/getRenderingEngine';
let csRenderInitialized = false;
let useSharedArrayBuffer = true;
let sharedArrayBufferMode = SharedArrayBufferModes.TRUE;
import { deepMerge } from './utilities';
const defaultConfig = {
    gpuTier: undefined,
    detectGPUConfig: {},
    rendering: {
        useCPURendering: false,
        preferSizeOverAccuracy: false,
        useNorm16Texture: false,
        strictZSpacingForVolumeViewport: true,
    },
};
let config = {
    gpuTier: undefined,
    detectGPUConfig: {},
    rendering: {
        useCPURendering: false,
        preferSizeOverAccuracy: false,
        useNorm16Texture: false,
        strictZSpacingForVolumeViewport: true,
    },
};
function _getGLContext() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ||
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl');
    return gl;
}
function _hasActiveWebGLContext() {
    const gl = _getGLContext();
    return (gl instanceof WebGLRenderingContext || gl instanceof WebGL2RenderingContext);
}
function hasSharedArrayBuffer() {
    try {
        if (new SharedArrayBuffer(0)) {
            return true;
        }
        else {
            return false;
        }
    }
    catch {
        return false;
    }
}
async function init(configuration = {}) {
    if (csRenderInitialized) {
        return csRenderInitialized;
    }
    config = deepMerge(defaultConfig, configuration);
    const hasWebGLContext = _hasActiveWebGLContext();
    if (!hasWebGLContext) {
        console.log('CornerstoneRender: GPU not detected, using CPU rendering');
        config.rendering.useCPURendering = true;
    }
    else {
        config.gpuTier =
            config.gpuTier || (await getGPUTier(config.detectGPUConfig));
        console.log('CornerstoneRender: Using detect-gpu to get the GPU benchmark:', config.gpuTier);
        if (config.gpuTier.tier < 1) {
            console.log('CornerstoneRender: GPU is not powerful enough, using CPU rendering');
            config.rendering.useCPURendering = true;
        }
        else {
            console.log('CornerstoneRender: using GPU rendering');
        }
    }
    setUseSharedArrayBuffer(sharedArrayBufferMode);
    csRenderInitialized = true;
    return csRenderInitialized;
}
function setUseCPURendering(status) {
    config.rendering.useCPURendering = status;
    csRenderInitialized = true;
    _updateRenderingPipelinesForAllViewports();
}
function setPreferSizeOverAccuracy(status) {
    config.rendering.preferSizeOverAccuracy = status;
    csRenderInitialized = true;
    _updateRenderingPipelinesForAllViewports();
}
function resetUseCPURendering() {
    config.rendering.useCPURendering = !_hasActiveWebGLContext();
    _updateRenderingPipelinesForAllViewports();
}
function getShouldUseCPURendering() {
    return config.rendering.useCPURendering;
}
function setUseSharedArrayBuffer(mode) {
    if (mode == SharedArrayBufferModes.AUTO) {
        sharedArrayBufferMode = SharedArrayBufferModes.AUTO;
        const hasSharedBuffer = hasSharedArrayBuffer();
        if (!hasSharedBuffer) {
            useSharedArrayBuffer = false;
            console.warn(`CornerstoneRender: SharedArray Buffer not allowed, performance may be slower.
        Try ensuring page is cross-origin isolated to enable SharedArrayBuffer.`);
        }
        else {
            useSharedArrayBuffer = true;
            console.log('CornerstoneRender: using SharedArrayBuffer');
        }
        return;
    }
    if (mode == SharedArrayBufferModes.TRUE || mode == true) {
        sharedArrayBufferMode = SharedArrayBufferModes.TRUE;
        useSharedArrayBuffer = true;
        return;
    }
    if (mode == SharedArrayBufferModes.FALSE || mode == false) {
        sharedArrayBufferMode = SharedArrayBufferModes.FALSE;
        useSharedArrayBuffer = false;
        return;
    }
}
function resetUseSharedArrayBuffer() {
    setUseSharedArrayBuffer(sharedArrayBufferMode);
}
function getShouldUseSharedArrayBuffer() {
    return useSharedArrayBuffer;
}
function isCornerstoneInitialized() {
    return csRenderInitialized;
}
function getConfiguration() {
    return config;
}
function setConfiguration(c) {
    config = c;
    _updateRenderingPipelinesForAllViewports();
}
function _updateRenderingPipelinesForAllViewports() {
    getRenderingEngines().forEach((engine) => engine
        .getViewports()
        .forEach((viewport) => viewport.updateRenderingPipeline?.()));
}
export { init, getShouldUseCPURendering, getShouldUseSharedArrayBuffer, isCornerstoneInitialized, setUseCPURendering, setUseSharedArrayBuffer, setPreferSizeOverAccuracy, resetUseCPURendering, resetUseSharedArrayBuffer, getConfiguration, setConfiguration, };
//# sourceMappingURL=init.js.map