import Events from '../enums/Events';
import renderingEngineCache from './renderingEngineCache';
import eventTarget from '../eventTarget';
import { triggerEvent, uuidv4 } from '../utilities';
import { vtkOffscreenMultiRenderWindow } from './vtkClasses';
import ViewportType from '../enums/ViewportType';
import VolumeViewport from './VolumeViewport';
import BaseVolumeViewport from './BaseVolumeViewport';
import StackViewport from './StackViewport';
import viewportTypeUsesCustomRenderingPipeline from './helpers/viewportTypeUsesCustomRenderingPipeline';
import getOrCreateCanvas from './helpers/getOrCreateCanvas';
import { getShouldUseCPURendering, isCornerstoneInitialized } from '../init';
import { OrientationAxis } from '../enums';
import VolumeViewport3D from './VolumeViewport3D';
const VIEWPORT_MIN_SIZE = 2;
class RenderingEngine {
    constructor(id) {
        this._needsRender = new Set();
        this._animationFrameSet = false;
        this._animationFrameHandle = null;
        this.renderFrameOfReference = (FrameOfReferenceUID) => {
            const viewports = this._getViewportsAsArray();
            const viewportIdsWithSameFrameOfReferenceUID = viewports.map((vp) => {
                if (vp.getFrameOfReferenceUID() === FrameOfReferenceUID) {
                    return vp.id;
                }
            });
            return this.renderViewports(viewportIdsWithSameFrameOfReferenceUID);
        };
        this._renderFlaggedViewports = () => {
            this._throwIfDestroyed();
            if (!this.useCPURendering) {
                this.performVtkDrawCall();
            }
            const viewports = this._getViewportsAsArray();
            const eventDetailArray = [];
            for (let i = 0; i < viewports.length; i++) {
                const viewport = viewports[i];
                if (this._needsRender.has(viewport.id)) {
                    const eventDetail = this.renderViewportUsingCustomOrVtkPipeline(viewport);
                    eventDetailArray.push(eventDetail);
                    viewport.setRendered();
                    this._needsRender.delete(viewport.id);
                    if (this._needsRender.size === 0) {
                        break;
                    }
                }
            }
            this._animationFrameSet = false;
            this._animationFrameHandle = null;
            eventDetailArray.forEach((eventDetail) => {
                if (!eventDetail?.element)
                    return;
                triggerEvent(eventDetail.element, Events.IMAGE_RENDERED, eventDetail);
            });
        };
        this.id = id ? id : uuidv4();
        this.useCPURendering = getShouldUseCPURendering();
        renderingEngineCache.set(this);
        if (!isCornerstoneInitialized()) {
            throw new Error('@cornerstonejs/core is not initialized, run init() first');
        }
        if (!this.useCPURendering) {
            this.offscreenMultiRenderWindow =
                vtkOffscreenMultiRenderWindow.newInstance();
            this.offScreenCanvasContainer = document.createElement('div');
            this.offscreenMultiRenderWindow.setContainer(this.offScreenCanvasContainer);
        }
        this._viewports = new Map();
        this.hasBeenDestroyed = false;
    }
    enableElement(viewportInputEntry) {
        const viewportInput = this._normalizeViewportInputEntry(viewportInputEntry);
        this._throwIfDestroyed();
        const { element, viewportId } = viewportInput;
        if (!element) {
            throw new Error('No element provided');
        }
        const viewport = this.getViewport(viewportId);
        if (viewport) {
            console.log('Viewport already exists, disabling it first');
            this.disableElement(viewportId);
            console.log(`Viewport ${viewportId} disabled`);
        }
        const { type } = viewportInput;
        const viewportUsesCustomRenderingPipeline = viewportTypeUsesCustomRenderingPipeline(type);
        if (!this.useCPURendering && !viewportUsesCustomRenderingPipeline) {
            this.enableVTKjsDrivenViewport(viewportInput);
        }
        else {
            this.addCustomViewport(viewportInput);
        }
        const canvas = getOrCreateCanvas(element);
        const { background } = viewportInput.defaultOptions;
        this.fillCanvasWithBackgroundColor(canvas, background);
    }
    disableElement(viewportId) {
        this._throwIfDestroyed();
        const viewport = this.getViewport(viewportId);
        if (!viewport) {
            console.warn(`viewport ${viewportId} does not exist`);
            return;
        }
        this._resetViewport(viewport);
        if (!viewportTypeUsesCustomRenderingPipeline(viewport.type) &&
            !this.useCPURendering) {
            this.offscreenMultiRenderWindow.removeRenderer(viewportId);
        }
        this._removeViewport(viewportId);
        viewport.isDisabled = true;
        this._needsRender.delete(viewportId);
        const viewports = this.getViewports();
        if (!viewports.length) {
            this._clearAnimationFrame();
        }
        const immediate = true;
        const keepCamera = true;
        this.resize(immediate, keepCamera);
    }
    setViewports(publicViewportInputEntries) {
        const viewportInputEntries = this._normalizeViewportInputEntries(publicViewportInputEntries);
        this._throwIfDestroyed();
        this._reset();
        const vtkDrivenViewportInputEntries = [];
        const customRenderingViewportInputEntries = [];
        viewportInputEntries.forEach((vpie) => {
            if (!this.useCPURendering &&
                !viewportTypeUsesCustomRenderingPipeline(vpie.type)) {
                vtkDrivenViewportInputEntries.push(vpie);
            }
            else {
                customRenderingViewportInputEntries.push(vpie);
            }
        });
        this.setVtkjsDrivenViewports(vtkDrivenViewportInputEntries);
        this.setCustomViewports(customRenderingViewportInputEntries);
    }
    resize(immediate = true, keepCamera = true) {
        this._throwIfDestroyed();
        const viewports = this._getViewportsAsArray();
        const vtkDrivenViewports = [];
        const customRenderingViewports = [];
        viewports.forEach((vpie) => {
            if (!viewportTypeUsesCustomRenderingPipeline(vpie.type)) {
                vtkDrivenViewports.push(vpie);
            }
            else {
                customRenderingViewports.push(vpie);
            }
        });
        if (vtkDrivenViewports.length) {
            this._resizeVTKViewports(vtkDrivenViewports, keepCamera, immediate);
        }
        if (customRenderingViewports.length) {
            this._resizeUsingCustomResizeHandler(customRenderingViewports, keepCamera, immediate);
        }
    }
    getViewport(viewportId) {
        return this._viewports.get(viewportId);
    }
    getViewports() {
        this._throwIfDestroyed();
        return this._getViewportsAsArray();
    }
    getStackViewports() {
        this._throwIfDestroyed();
        const viewports = this.getViewports();
        const isStackViewport = (viewport) => {
            return viewport instanceof StackViewport;
        };
        return viewports.filter(isStackViewport);
    }
    getVolumeViewports() {
        this._throwIfDestroyed();
        const viewports = this.getViewports();
        const isVolumeViewport = (viewport) => {
            return viewport instanceof BaseVolumeViewport;
        };
        return viewports.filter(isVolumeViewport);
    }
    render() {
        const viewports = this.getViewports();
        const viewportIds = viewports.map((vp) => vp.id);
        this._setViewportsToBeRenderedNextFrame(viewportIds);
    }
    renderViewports(viewportIds) {
        this._setViewportsToBeRenderedNextFrame(viewportIds);
    }
    renderViewport(viewportId) {
        this._setViewportsToBeRenderedNextFrame([viewportId]);
    }
    destroy() {
        if (this.hasBeenDestroyed) {
            return;
        }
        if (!this.useCPURendering) {
            const viewports = this._getViewportsAsArray();
            viewports.forEach((vp) => {
                this.offscreenMultiRenderWindow.removeRenderer(vp.id);
            });
            this.offscreenMultiRenderWindow.delete();
            delete this.offscreenMultiRenderWindow;
        }
        this._reset();
        renderingEngineCache.delete(this.id);
        this.hasBeenDestroyed = true;
    }
    fillCanvasWithBackgroundColor(canvas, backgroundColor) {
        const ctx = canvas.getContext('2d');
        let fillStyle;
        if (backgroundColor) {
            const rgb = backgroundColor.map((f) => Math.floor(255 * f));
            fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
        }
        else {
            fillStyle = 'black';
        }
        ctx.fillStyle = fillStyle;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    _normalizeViewportInputEntry(viewportInputEntry) {
        const { type, defaultOptions } = viewportInputEntry;
        let options = defaultOptions;
        if (!options || Object.keys(options).length === 0) {
            options = {
                background: [0, 0, 0],
                orientation: null,
                displayArea: null,
            };
            if (type === ViewportType.ORTHOGRAPHIC) {
                options = {
                    ...options,
                    orientation: OrientationAxis.AXIAL,
                };
            }
        }
        return {
            ...viewportInputEntry,
            defaultOptions: options,
        };
    }
    _normalizeViewportInputEntries(viewportInputEntries) {
        const normalizedViewportInputs = [];
        viewportInputEntries.forEach((viewportInput) => {
            normalizedViewportInputs.push(this._normalizeViewportInputEntry(viewportInput));
        });
        return normalizedViewportInputs;
    }
    _resizeUsingCustomResizeHandler(customRenderingViewports, keepCamera = true, immediate = true) {
        customRenderingViewports.forEach((vp) => {
            if (typeof vp.resize === 'function')
                vp.resize();
        });
        customRenderingViewports.forEach((vp) => {
            const prevCamera = vp.getCamera();
            vp.resetCamera();
            if (keepCamera) {
                vp.setCamera(prevCamera);
            }
        });
        if (immediate === true) {
            this.render();
        }
    }
    _resizeVTKViewports(vtkDrivenViewports, keepCamera = true, immediate = true) {
        const canvasesDrivenByVtkJs = vtkDrivenViewports.map((vp) => vp.canvas);
        if (canvasesDrivenByVtkJs.length) {
            const { offScreenCanvasWidth, offScreenCanvasHeight } = this._resizeOffScreenCanvas(canvasesDrivenByVtkJs);
            this._resize(vtkDrivenViewports, offScreenCanvasWidth, offScreenCanvasHeight);
        }
        vtkDrivenViewports.forEach((vp) => {
            const canvas = getOrCreateCanvas(vp.element);
            const rect = canvas.getBoundingClientRect();
            const devicePixelRatio = window.devicePixelRatio || 1;
            canvas.width = rect.width * devicePixelRatio;
            canvas.height = rect.height * devicePixelRatio;
            const prevCamera = vp.getCamera();
            vp.resetCamera();
            if (keepCamera) {
                vp.setCamera(prevCamera);
            }
        });
        if (immediate === true) {
            this.render();
        }
    }
    enableVTKjsDrivenViewport(viewportInputEntry) {
        const viewports = this._getViewportsAsArray();
        const viewportsDrivenByVtkJs = viewports.filter((vp) => viewportTypeUsesCustomRenderingPipeline(vp.type) === false);
        const canvasesDrivenByVtkJs = viewportsDrivenByVtkJs.map((vp) => vp.canvas);
        const canvas = getOrCreateCanvas(viewportInputEntry.element);
        canvasesDrivenByVtkJs.push(canvas);
        const devicePixelRatio = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * devicePixelRatio;
        canvas.height = rect.height * devicePixelRatio;
        const { offScreenCanvasWidth, offScreenCanvasHeight } = this._resizeOffScreenCanvas(canvasesDrivenByVtkJs);
        const xOffset = this._resize(viewportsDrivenByVtkJs, offScreenCanvasWidth, offScreenCanvasHeight);
        const internalViewportEntry = { ...viewportInputEntry, canvas };
        this.addVtkjsDrivenViewport(internalViewportEntry, {
            offScreenCanvasWidth,
            offScreenCanvasHeight,
            xOffset,
        });
    }
    _removeViewport(viewportId) {
        const viewport = this.getViewport(viewportId);
        if (!viewport) {
            console.warn(`viewport ${viewportId} does not exist`);
            return;
        }
        this._viewports.delete(viewportId);
    }
    addVtkjsDrivenViewport(viewportInputEntry, offscreenCanvasProperties) {
        const { element, canvas, viewportId, type, defaultOptions } = viewportInputEntry;
        element.tabIndex = -1;
        const { offScreenCanvasWidth, offScreenCanvasHeight, xOffset } = offscreenCanvasProperties;
        const { sxStartDisplayCoords, syStartDisplayCoords, sxEndDisplayCoords, syEndDisplayCoords, sx, sy, sWidth, sHeight, } = this._getViewportCoordsOnOffScreenCanvas(viewportInputEntry, offScreenCanvasWidth, offScreenCanvasHeight, xOffset);
        this.offscreenMultiRenderWindow.addRenderer({
            viewport: [
                sxStartDisplayCoords,
                syStartDisplayCoords,
                sxEndDisplayCoords,
                syEndDisplayCoords,
            ],
            id: viewportId,
            background: defaultOptions.background
                ? defaultOptions.background
                : [0, 0, 0],
        });
        const viewportInput = {
            id: viewportId,
            element,
            renderingEngineId: this.id,
            type,
            canvas,
            sx,
            sy,
            sWidth,
            sHeight,
            defaultOptions: defaultOptions || {},
        };
        let viewport;
        if (type === ViewportType.STACK) {
            viewport = new StackViewport(viewportInput);
        }
        else if (type === ViewportType.ORTHOGRAPHIC ||
            type === ViewportType.PERSPECTIVE) {
            viewport = new VolumeViewport(viewportInput);
        }
        else if (type === ViewportType.VOLUME_3D) {
            viewport = new VolumeViewport3D(viewportInput);
        }
        else {
            throw new Error(`Viewport Type ${type} is not supported`);
        }
        this._viewports.set(viewportId, viewport);
        const eventDetail = {
            element,
            viewportId,
            renderingEngineId: this.id,
        };
        if (!viewport.suppressEvents) {
            triggerEvent(eventTarget, Events.ELEMENT_ENABLED, eventDetail);
        }
    }
    addCustomViewport(viewportInputEntry) {
        const { element, viewportId, type, defaultOptions } = viewportInputEntry;
        element.tabIndex = -1;
        const canvas = getOrCreateCanvas(element);
        const { clientWidth, clientHeight } = canvas;
        if (canvas.width !== clientWidth || canvas.height !== clientHeight) {
            canvas.width = clientWidth;
            canvas.height = clientHeight;
        }
        const viewportInput = {
            id: viewportId,
            renderingEngineId: this.id,
            element,
            type,
            canvas,
            sx: 0,
            sy: 0,
            sWidth: clientWidth,
            sHeight: clientHeight,
            defaultOptions: defaultOptions || {},
        };
        if (type !== ViewportType.STACK) {
            throw new Error('Support for fully custom viewports not yet implemented');
        }
        const viewport = new StackViewport(viewportInput);
        this._viewports.set(viewportId, viewport);
        const eventDetail = {
            element,
            viewportId,
            renderingEngineId: this.id,
        };
        triggerEvent(eventTarget, Events.ELEMENT_ENABLED, eventDetail);
    }
    setCustomViewports(viewportInputEntries) {
        viewportInputEntries.forEach((vpie) => this.addCustomViewport(vpie));
    }
    setVtkjsDrivenViewports(viewportInputEntries) {
        if (viewportInputEntries.length) {
            const vtkDrivenCanvases = viewportInputEntries.map((vp) => getOrCreateCanvas(vp.element));
            vtkDrivenCanvases.forEach((canvas) => {
                const devicePixelRatio = window.devicePixelRatio || 1;
                const rect = canvas.getBoundingClientRect();
                canvas.width = rect.width * devicePixelRatio;
                canvas.height = rect.height * devicePixelRatio;
            });
            const { offScreenCanvasWidth, offScreenCanvasHeight } = this._resizeOffScreenCanvas(vtkDrivenCanvases);
            let xOffset = 0;
            for (let i = 0; i < viewportInputEntries.length; i++) {
                const vtkDrivenViewportInputEntry = viewportInputEntries[i];
                const canvas = vtkDrivenCanvases[i];
                const internalViewportEntry = {
                    ...vtkDrivenViewportInputEntry,
                    canvas,
                };
                this.addVtkjsDrivenViewport(internalViewportEntry, {
                    offScreenCanvasWidth,
                    offScreenCanvasHeight,
                    xOffset,
                });
                xOffset += canvas.width;
            }
        }
    }
    _resizeOffScreenCanvas(canvasesDrivenByVtkJs) {
        const { offScreenCanvasContainer, offscreenMultiRenderWindow } = this;
        const devicePixelRatio = window.devicePixelRatio || 1;
        const offScreenCanvasHeight = Math.max(...canvasesDrivenByVtkJs.map((canvas) => canvas.clientHeight * devicePixelRatio));
        let offScreenCanvasWidth = 0;
        canvasesDrivenByVtkJs.forEach((canvas) => {
            offScreenCanvasWidth += canvas.clientWidth * devicePixelRatio;
        });
        offScreenCanvasContainer.width = offScreenCanvasWidth;
        offScreenCanvasContainer.height = offScreenCanvasHeight;
        offscreenMultiRenderWindow.resize();
        return { offScreenCanvasWidth, offScreenCanvasHeight };
    }
    _resize(viewportsDrivenByVtkJs, offScreenCanvasWidth, offScreenCanvasHeight) {
        let _xOffset = 0;
        const devicePixelRatio = window.devicePixelRatio || 1;
        for (let i = 0; i < viewportsDrivenByVtkJs.length; i++) {
            const viewport = viewportsDrivenByVtkJs[i];
            const { sxStartDisplayCoords, syStartDisplayCoords, sxEndDisplayCoords, syEndDisplayCoords, sx, sy, sWidth, sHeight, } = this._getViewportCoordsOnOffScreenCanvas(viewport, offScreenCanvasWidth, offScreenCanvasHeight, _xOffset);
            _xOffset += viewport.canvas.clientWidth * devicePixelRatio;
            viewport.sx = sx;
            viewport.sy = sy;
            viewport.sWidth = sWidth;
            viewport.sHeight = sHeight;
            const renderer = this.offscreenMultiRenderWindow.getRenderer(viewport.id);
            renderer.setViewport([
                sxStartDisplayCoords,
                syStartDisplayCoords,
                sxEndDisplayCoords,
                syEndDisplayCoords,
            ]);
        }
        return _xOffset;
    }
    _getViewportCoordsOnOffScreenCanvas(viewport, offScreenCanvasWidth, offScreenCanvasHeight, _xOffset) {
        const { canvas } = viewport;
        const { clientWidth, clientHeight } = canvas;
        const devicePixelRatio = window.devicePixelRatio || 1;
        const height = clientHeight * devicePixelRatio;
        const width = clientWidth * devicePixelRatio;
        const sx = _xOffset;
        const sy = 0;
        const sWidth = width;
        const sHeight = height;
        const sxStartDisplayCoords = sx / offScreenCanvasWidth;
        const syStartDisplayCoords = sy + (offScreenCanvasHeight - height) / offScreenCanvasHeight;
        const sWidthDisplayCoords = sWidth / offScreenCanvasWidth;
        const sHeightDisplayCoords = sHeight / offScreenCanvasHeight;
        return {
            sxStartDisplayCoords,
            syStartDisplayCoords,
            sxEndDisplayCoords: sxStartDisplayCoords + sWidthDisplayCoords,
            syEndDisplayCoords: syStartDisplayCoords + sHeightDisplayCoords,
            sx,
            sy,
            sWidth,
            sHeight,
        };
    }
    _getViewportsAsArray() {
        return Array.from(this._viewports.values());
    }
    _setViewportsToBeRenderedNextFrame(viewportIds) {
        viewportIds.forEach((viewportId) => {
            this._needsRender.add(viewportId);
        });
        this._render();
    }
    _render() {
        if (this._needsRender.size > 0 && this._animationFrameSet === false) {
            this._animationFrameHandle = window.requestAnimationFrame(this._renderFlaggedViewports);
            this._animationFrameSet = true;
        }
    }
    performVtkDrawCall() {
        const { offscreenMultiRenderWindow } = this;
        const renderWindow = offscreenMultiRenderWindow.getRenderWindow();
        const renderers = offscreenMultiRenderWindow.getRenderers();
        if (!renderers.length) {
            return;
        }
        for (let i = 0; i < renderers.length; i++) {
            const { renderer, id } = renderers[i];
            if (this._needsRender.has(id)) {
                renderer.setDraw(true);
            }
            else {
                renderer.setDraw(false);
            }
        }
        renderWindow.render();
        for (let i = 0; i < renderers.length; i++) {
            renderers[i].renderer.setDraw(false);
        }
    }
    renderViewportUsingCustomOrVtkPipeline(viewport) {
        let eventDetail;
        if (viewport.sWidth < VIEWPORT_MIN_SIZE ||
            viewport.sHeight < VIEWPORT_MIN_SIZE) {
            console.log('Viewport is too small', viewport.sWidth, viewport.sHeight);
            return;
        }
        if (viewportTypeUsesCustomRenderingPipeline(viewport.type) === true) {
            eventDetail =
                viewport.customRenderViewportToCanvas();
        }
        else {
            if (this.useCPURendering) {
                throw new Error('GPU not available, and using a viewport with no custom render pipeline.');
            }
            const { offscreenMultiRenderWindow } = this;
            const openGLRenderWindow = offscreenMultiRenderWindow.getOpenGLRenderWindow();
            const context = openGLRenderWindow.get3DContext();
            const offScreenCanvas = context.canvas;
            eventDetail = this._renderViewportFromVtkCanvasToOnscreenCanvas(viewport, offScreenCanvas);
        }
        return eventDetail;
    }
    _renderViewportFromVtkCanvasToOnscreenCanvas(viewport, offScreenCanvas) {
        const { element, canvas, sx, sy, sWidth, sHeight, id: viewportId, renderingEngineId, suppressEvents, } = viewport;
        const { width: dWidth, height: dHeight } = canvas;
        const onScreenContext = canvas.getContext('2d');
        onScreenContext.drawImage(offScreenCanvas, sx, sy, sWidth, sHeight, 0, 0, dWidth, dHeight);
        return {
            element,
            suppressEvents,
            viewportId,
            renderingEngineId,
            viewportStatus: viewport.viewportStatus,
        };
    }
    _resetViewport(viewport) {
        const renderingEngineId = this.id;
        const { element, canvas, id: viewportId } = viewport;
        const eventDetail = {
            element,
            viewportId,
            renderingEngineId,
        };
        triggerEvent(eventTarget, Events.ELEMENT_DISABLED, eventDetail);
        element.removeAttribute('data-viewport-uid');
        element.removeAttribute('data-rendering-engine-uid');
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
    }
    _clearAnimationFrame() {
        window.cancelAnimationFrame(this._animationFrameHandle);
        this._needsRender.clear();
        this._animationFrameSet = false;
        this._animationFrameHandle = null;
    }
    _reset() {
        const viewports = this._getViewportsAsArray();
        viewports.forEach((viewport) => {
            this._resetViewport(viewport);
        });
        this._clearAnimationFrame();
        this._viewports = new Map();
    }
    _throwIfDestroyed() {
        if (this.hasBeenDestroyed) {
            throw new Error('this.destroy() has been manually called to free up memory, can not longer use this instance. Instead make a new one.');
        }
    }
    _downloadOffScreenCanvas() {
        const dataURL = this._debugRender();
        _TEMPDownloadURI(dataURL);
    }
    _debugRender() {
        const { offscreenMultiRenderWindow } = this;
        const renderWindow = offscreenMultiRenderWindow.getRenderWindow();
        const renderers = offscreenMultiRenderWindow.getRenderers();
        for (let i = 0; i < renderers.length; i++) {
            renderers[i].renderer.setDraw(true);
        }
        renderWindow.render();
        const openGLRenderWindow = offscreenMultiRenderWindow.getOpenGLRenderWindow();
        const context = openGLRenderWindow.get3DContext();
        const offScreenCanvas = context.canvas;
        const dataURL = offScreenCanvas.toDataURL();
        this._getViewportsAsArray().forEach((viewport) => {
            const { sx, sy, sWidth, sHeight } = viewport;
            const canvas = viewport.canvas;
            const { width: dWidth, height: dHeight } = canvas;
            const onScreenContext = canvas.getContext('2d');
            onScreenContext.drawImage(offScreenCanvas, sx, sy, sWidth, sHeight, 0, 0, dWidth, dHeight);
        });
        return dataURL;
    }
}
export default RenderingEngine;
function _TEMPDownloadURI(uri) {
    const link = document.createElement('a');
    link.download = 'viewport.png';
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
//# sourceMappingURL=RenderingEngine.js.map