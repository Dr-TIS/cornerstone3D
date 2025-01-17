"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setConfiguration = exports.getConfiguration = exports.resetUseSharedArrayBuffer = exports.resetUseCPURendering = exports.setPreferSizeOverAccuracy = exports.setUseSharedArrayBuffer = exports.setUseCPURendering = exports.isCornerstoneInitialized = exports.getShouldUseSharedArrayBuffer = exports.getShouldUseCPURendering = exports.init = void 0;
const detect_gpu_1 = require("detect-gpu");
const enums_1 = require("./enums");
const getRenderingEngine_1 = require("./RenderingEngine/getRenderingEngine");
let csRenderInitialized = false;
let useSharedArrayBuffer = true;
let sharedArrayBufferMode = enums_1.SharedArrayBufferModes.TRUE;
const utilities_1 = require("./utilities");
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
    catch (_a) {
        return false;
    }
}
function init(configuration = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        if (csRenderInitialized) {
            return csRenderInitialized;
        }
        config = (0, utilities_1.deepMerge)(defaultConfig, configuration);
        const hasWebGLContext = _hasActiveWebGLContext();
        if (!hasWebGLContext) {
            console.log('CornerstoneRender: GPU not detected, using CPU rendering');
            config.rendering.useCPURendering = true;
        }
        else {
            config.gpuTier =
                config.gpuTier || (yield (0, detect_gpu_1.getGPUTier)(config.detectGPUConfig));
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
    });
}
exports.init = init;
function setUseCPURendering(status) {
    config.rendering.useCPURendering = status;
    csRenderInitialized = true;
    _updateRenderingPipelinesForAllViewports();
}
exports.setUseCPURendering = setUseCPURendering;
function setPreferSizeOverAccuracy(status) {
    config.rendering.preferSizeOverAccuracy = status;
    csRenderInitialized = true;
    _updateRenderingPipelinesForAllViewports();
}
exports.setPreferSizeOverAccuracy = setPreferSizeOverAccuracy;
function resetUseCPURendering() {
    config.rendering.useCPURendering = !_hasActiveWebGLContext();
    _updateRenderingPipelinesForAllViewports();
}
exports.resetUseCPURendering = resetUseCPURendering;
function getShouldUseCPURendering() {
    return config.rendering.useCPURendering;
}
exports.getShouldUseCPURendering = getShouldUseCPURendering;
function setUseSharedArrayBuffer(mode) {
    if (mode == enums_1.SharedArrayBufferModes.AUTO) {
        sharedArrayBufferMode = enums_1.SharedArrayBufferModes.AUTO;
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
    if (mode == enums_1.SharedArrayBufferModes.TRUE || mode == true) {
        sharedArrayBufferMode = enums_1.SharedArrayBufferModes.TRUE;
        useSharedArrayBuffer = true;
        return;
    }
    if (mode == enums_1.SharedArrayBufferModes.FALSE || mode == false) {
        sharedArrayBufferMode = enums_1.SharedArrayBufferModes.FALSE;
        useSharedArrayBuffer = false;
        return;
    }
}
exports.setUseSharedArrayBuffer = setUseSharedArrayBuffer;
function resetUseSharedArrayBuffer() {
    setUseSharedArrayBuffer(sharedArrayBufferMode);
}
exports.resetUseSharedArrayBuffer = resetUseSharedArrayBuffer;
function getShouldUseSharedArrayBuffer() {
    return useSharedArrayBuffer;
}
exports.getShouldUseSharedArrayBuffer = getShouldUseSharedArrayBuffer;
function isCornerstoneInitialized() {
    return csRenderInitialized;
}
exports.isCornerstoneInitialized = isCornerstoneInitialized;
function getConfiguration() {
    return config;
}
exports.getConfiguration = getConfiguration;
function setConfiguration(c) {
    config = c;
    _updateRenderingPipelinesForAllViewports();
}
exports.setConfiguration = setConfiguration;
function _updateRenderingPipelinesForAllViewports() {
    (0, getRenderingEngine_1.getRenderingEngines)().forEach((engine) => engine
        .getViewports()
        .forEach((viewport) => { var _a; return (_a = viewport.updateRenderingPipeline) === null || _a === void 0 ? void 0 : _a.call(viewport); }));
}
//# sourceMappingURL=init.js.map