"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setConfiguration = exports.getConfiguration = exports.disable = exports.enable = void 0;
const core_1 = require("@cornerstonejs/core");
const state_1 = require("./state");
const requestType = core_1.Enums.RequestType.Prefetch;
const priority = 0;
const addToBeginning = true;
let configuration = {
    maxImagesToPrefetch: Infinity,
    preserveExistingPool: false,
};
let resetPrefetchTimeout;
const resetPrefetchDelay = 10;
function range(lowEnd, highEnd) {
    lowEnd = Math.round(lowEnd) || 0;
    highEnd = Math.round(highEnd) || 0;
    const arr = [];
    let c = highEnd - lowEnd + 1;
    if (c <= 0) {
        return arr;
    }
    while (c--) {
        arr[c] = highEnd--;
    }
    return arr;
}
function nearestIndex(arr, x) {
    let low = 0;
    let high = arr.length - 1;
    arr.forEach((v, idx) => {
        if (v < x) {
            low = Math.max(idx, low);
        }
        else if (v > x) {
            high = Math.min(idx, high);
        }
    });
    return { low, high };
}
function getStackData(element) {
    const enabledElement = (0, core_1.getEnabledElement)(element);
    if (!enabledElement) {
        throw new Error('stackPrefetch: element must be a valid Cornerstone enabled element');
    }
    const { viewport } = enabledElement;
    if (!(viewport instanceof core_1.StackViewport)) {
        throw new Error('stackPrefetch: element must be a StackViewport, VolumeViewport stackPrefetch not yet implemented');
    }
    return {
        currentImageIdIndex: viewport.getCurrentImageIdIndex(),
        imageIds: viewport.getImageIds(),
    };
}
function prefetch(element) {
    const stackPrefetchData = (0, state_1.getToolState)(element);
    if (!stackPrefetchData) {
        return;
    }
    const stackPrefetch = stackPrefetchData || {};
    const stack = getStackData(element);
    if (!stack || !stack.imageIds || stack.imageIds.length === 0) {
        console.warn('CornerstoneTools.stackPrefetch: No images in stack.');
        return;
    }
    if (!stackPrefetch.indicesToRequest ||
        !stackPrefetch.indicesToRequest.length) {
        stackPrefetch.enabled = false;
    }
    if (stackPrefetch.enabled === false) {
        return;
    }
    function removeFromList(imageIdIndex) {
        const index = stackPrefetch.indicesToRequest.indexOf(imageIdIndex);
        if (index > -1) {
            stackPrefetch.indicesToRequest.splice(index, 1);
        }
    }
    stackPrefetchData.indicesToRequest.sort((a, b) => a - b);
    const indicesToRequestCopy = stackPrefetch.indicesToRequest.slice();
    indicesToRequestCopy.forEach(function (imageIdIndex) {
        const imageId = stack.imageIds[imageIdIndex];
        if (!imageId) {
            return;
        }
        const imageLoadObject = core_1.cache.getImageLoadObject(imageId);
        if (imageLoadObject) {
            removeFromList(imageIdIndex);
        }
    });
    if (!stackPrefetch.indicesToRequest.length) {
        return;
    }
    if (!configuration.preserveExistingPool) {
        core_1.imageLoadPoolManager.clearRequestStack(requestType);
    }
    const nearest = nearestIndex(stackPrefetch.indicesToRequest, stack.currentImageIdIndex);
    let imageId;
    let nextImageIdIndex;
    const preventCache = false;
    function doneCallback(image) {
        console.log('prefetch done: %s', image.imageId);
        const imageIdIndex = stack.imageIds.indexOf(image.imageId);
        removeFromList(imageIdIndex);
    }
    let lowerIndex = nearest.low;
    let higherIndex = nearest.high;
    const imageIdsToPrefetch = [];
    while (lowerIndex >= 0 ||
        higherIndex < stackPrefetch.indicesToRequest.length) {
        const currentIndex = stack.currentImageIdIndex;
        const shouldSkipLower = currentIndex - stackPrefetch.indicesToRequest[lowerIndex] >
            configuration.maxImagesToPrefetch;
        const shouldSkipHigher = stackPrefetch.indicesToRequest[higherIndex] - currentIndex >
            configuration.maxImagesToPrefetch;
        const shouldLoadLower = !shouldSkipLower && lowerIndex >= 0;
        const shouldLoadHigher = !shouldSkipHigher && higherIndex < stackPrefetch.indicesToRequest.length;
        if (!shouldLoadHigher && !shouldLoadLower) {
            break;
        }
        if (shouldLoadLower) {
            nextImageIdIndex = stackPrefetch.indicesToRequest[lowerIndex--];
            imageId = stack.imageIds[nextImageIdIndex];
            imageIdsToPrefetch.push(imageId);
        }
        if (shouldLoadHigher) {
            nextImageIdIndex = stackPrefetch.indicesToRequest[higherIndex++];
            imageId = stack.imageIds[nextImageIdIndex];
            imageIdsToPrefetch.push(imageId);
        }
    }
    const requestFn = (imageId, options) => core_1.imageLoader.loadAndCacheImage(imageId, options);
    const { useNorm16Texture } = (0, core_1.getConfiguration)().rendering;
    imageIdsToPrefetch.forEach((imageId) => {
        const options = {
            targetBuffer: {
                type: useNorm16Texture ? undefined : 'Float32Array',
            },
            preScale: {
                enabled: true,
            },
            requestType,
        };
        core_1.imageLoadPoolManager.addRequest(requestFn.bind(null, imageId, options), requestType, {
            imageId,
        }, priority);
    });
}
function getPromiseRemovedHandler(element) {
    return function (e) {
        const eventData = e.detail;
        let stackData;
        try {
            stackData = getStackData(element);
        }
        catch (error) {
            return;
        }
        if (!stackData || !stackData.imageIds || stackData.imageIds.length === 0) {
            return;
        }
        const stack = stackData;
        const imageIdIndex = stack.imageIds.indexOf(eventData.imageId);
        if (imageIdIndex < 0) {
            return;
        }
        const stackPrefetchData = (0, state_1.getToolState)(element);
        if (!stackPrefetchData ||
            !stackPrefetchData.data ||
            !stackPrefetchData.data.length) {
            return;
        }
        stackPrefetchData.indicesToRequest.push(imageIdIndex);
    };
}
function onImageUpdated(e) {
    clearTimeout(resetPrefetchTimeout);
    resetPrefetchTimeout = setTimeout(function () {
        const element = e.target;
        try {
            prefetch(element);
        }
        catch (error) {
            return;
        }
    }, resetPrefetchDelay);
}
function enable(element) {
    const stack = getStackData(element);
    if (!stack || !stack.imageIds || stack.imageIds.length === 0) {
        console.warn('CornerstoneTools.stackPrefetch: No images in stack.');
        return;
    }
    const stackPrefetchData = {
        indicesToRequest: range(0, stack.imageIds.length - 1),
        enabled: true,
        direction: 1,
    };
    const indexOfCurrentImage = stackPrefetchData.indicesToRequest.indexOf(stack.currentImageIdIndex);
    stackPrefetchData.indicesToRequest.splice(indexOfCurrentImage, 1);
    (0, state_1.addToolState)(element, stackPrefetchData);
    prefetch(element);
    element.removeEventListener(core_1.Enums.Events.STACK_NEW_IMAGE, onImageUpdated);
    element.addEventListener(core_1.Enums.Events.STACK_NEW_IMAGE, onImageUpdated);
    const promiseRemovedHandler = getPromiseRemovedHandler(element);
    core_1.eventTarget.removeEventListener(core_1.Enums.Events.IMAGE_CACHE_IMAGE_REMOVED, promiseRemovedHandler);
    core_1.eventTarget.addEventListener(core_1.Enums.Events.IMAGE_CACHE_IMAGE_REMOVED, promiseRemovedHandler);
}
exports.enable = enable;
function disable(element) {
    clearTimeout(resetPrefetchTimeout);
    element.removeEventListener(core_1.Enums.Events.STACK_NEW_IMAGE, onImageUpdated);
    const promiseRemovedHandler = getPromiseRemovedHandler(element);
    core_1.eventTarget.removeEventListener(core_1.Enums.Events.IMAGE_CACHE_IMAGE_REMOVED, promiseRemovedHandler);
    const stackPrefetchData = (0, state_1.getToolState)(element);
    if (stackPrefetchData && stackPrefetchData.data.length) {
        stackPrefetchData.enabled = false;
        core_1.imageLoadPoolManager.clearRequestStack(requestType);
    }
}
exports.disable = disable;
function getConfiguration() {
    return configuration;
}
exports.getConfiguration = getConfiguration;
function setConfiguration(config) {
    configuration = config;
}
exports.setConfiguration = setConfiguration;
//# sourceMappingURL=stackPrefetch.js.map