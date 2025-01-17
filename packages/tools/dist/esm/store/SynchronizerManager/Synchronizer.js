import { getRenderingEngine, getEnabledElement, Enums, } from '@cornerstonejs/core';
class Synchronizer {
    constructor(synchronizerId, eventName, eventHandler, options) {
        this._viewportOptions = {};
        this._onEvent = (evt) => {
            if (this._ignoreFiredEvents === true) {
                return;
            }
            if (!this._targetViewports.length) {
                return;
            }
            const enabledElement = getEnabledElement(evt.currentTarget);
            if (!enabledElement) {
                return;
            }
            const { renderingEngineId, viewportId } = enabledElement;
            if (!this._sourceViewports.find((s) => s.viewportId === viewportId)) {
                return;
            }
            this.fireEvent({
                renderingEngineId,
                viewportId,
            }, evt);
        };
        this._enabled = true;
        this._eventName = eventName;
        this._eventHandler = eventHandler;
        this._ignoreFiredEvents = false;
        this._sourceViewports = [];
        this._targetViewports = [];
        this._options = options || {};
        this.id = synchronizerId;
    }
    isDisabled() {
        return !this._enabled || !this._hasSourceElements();
    }
    setOptions(viewportId, options = {}) {
        this._viewportOptions[viewportId] = options;
    }
    getOptions(viewportId) {
        return this._viewportOptions[viewportId];
    }
    add(viewportInfo) {
        this.addTarget(viewportInfo);
        this.addSource(viewportInfo);
    }
    addSource(viewportInfo) {
        if (_containsViewport(this._sourceViewports, viewportInfo)) {
            return;
        }
        const { renderingEngineId, viewportId } = viewportInfo;
        const { element } = getRenderingEngine(renderingEngineId).getViewport(viewportId);
        element.addEventListener(this._eventName, this._onEvent.bind(this));
        this._updateDisableHandlers();
        this._sourceViewports.push(viewportInfo);
    }
    addTarget(viewportInfo) {
        if (_containsViewport(this._targetViewports, viewportInfo)) {
            return;
        }
        this._targetViewports.push(viewportInfo);
        this._updateDisableHandlers();
    }
    getSourceViewports() {
        return this._sourceViewports;
    }
    getTargetViewports() {
        return this._targetViewports;
    }
    destroy() {
        this._sourceViewports.forEach((s) => this.removeSource(s));
        this._targetViewports.forEach((t) => this.removeTarget(t));
    }
    remove(viewportInfo) {
        this.removeTarget(viewportInfo);
        this.removeSource(viewportInfo);
    }
    removeSource(viewportInfo) {
        const index = _getViewportIndex(this._sourceViewports, viewportInfo);
        if (index === -1) {
            return;
        }
        const element = _getViewportElement(viewportInfo);
        this._sourceViewports.splice(index, 1);
        element.removeEventListener(this._eventName, this._eventHandler);
        this._updateDisableHandlers();
    }
    removeTarget(viewportInfo) {
        const index = _getViewportIndex(this._targetViewports, viewportInfo);
        if (index === -1) {
            return;
        }
        this._targetViewports.splice(index, 1);
        this._updateDisableHandlers();
    }
    hasSourceViewport(renderingEngineId, viewportId) {
        return _containsViewport(this._sourceViewports, {
            renderingEngineId,
            viewportId,
        });
    }
    hasTargetViewport(renderingEngineId, viewportId) {
        return _containsViewport(this._targetViewports, {
            renderingEngineId,
            viewportId,
        });
    }
    fireEvent(sourceViewport, sourceEvent) {
        if (this.isDisabled() || this._ignoreFiredEvents) {
            return;
        }
        this._ignoreFiredEvents = true;
        try {
            for (let i = 0; i < this._targetViewports.length; i++) {
                const targetViewport = this._targetViewports[i];
                const targetIsSource = sourceViewport.viewportId === targetViewport.viewportId;
                if (targetIsSource) {
                    continue;
                }
                this._eventHandler(this, sourceViewport, targetViewport, sourceEvent, this._options);
            }
        }
        catch (ex) {
            console.warn(`Synchronizer, for: ${this._eventName}`, ex);
        }
        finally {
            this._ignoreFiredEvents = false;
        }
    }
    _hasSourceElements() {
        return this._sourceViewports.length !== 0;
    }
    _updateDisableHandlers() {
        const viewports = _getUniqueViewports(this._sourceViewports, this._targetViewports);
        const _remove = this.remove;
        const disableHandler = (elementDisabledEvent) => {
            _remove(elementDisabledEvent.detail.element);
        };
        viewports.forEach(function (vUid) {
            const renderingEngine = getRenderingEngine(vUid.renderingEngineId).getViewport(vUid.viewportId);
            if (!renderingEngine) {
                return;
            }
            const { element } = renderingEngine;
            element.removeEventListener(Enums.Events.ELEMENT_DISABLED, disableHandler);
            element.addEventListener(Enums.Events.ELEMENT_DISABLED, disableHandler);
        });
    }
}
function _getUniqueViewports(vp1, vp2) {
    const unique = [];
    const vps = vp1.concat(vp2);
    for (let i = 0; i < vps.length; i++) {
        const vp = vps[i];
        if (!unique.some((u) => vp.renderingEngineId === u.renderingEngineId &&
            vp.viewportId === u.viewportId)) {
            unique.push(vp);
        }
    }
    return unique;
}
function _getViewportIndex(arr, vp) {
    return arr.findIndex((ar) => vp.renderingEngineId === ar.renderingEngineId &&
        vp.viewportId === ar.viewportId);
}
function _containsViewport(arr, vp) {
    return arr.some((ar) => ar.renderingEngineId === vp.renderingEngineId &&
        ar.viewportId === vp.viewportId);
}
function _getViewportElement(vp) {
    const renderingEngine = getRenderingEngine(vp.renderingEngineId);
    if (!renderingEngine) {
        throw new Error(`No RenderingEngine for Id: ${vp.renderingEngineId}`);
    }
    return renderingEngine.getViewport(vp.viewportId).element;
}
export default Synchronizer;
//# sourceMappingURL=Synchronizer.js.map