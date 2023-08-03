"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const MatrixBuilder_1 = __importDefault(require("@kitware/vtk.js/Common/Core/MatrixBuilder"));
const Math_1 = __importDefault(require("@kitware/vtk.js/Common/Core/Math"));
const gl_matrix_1 = require("gl-matrix");
const lodash_clonedeep_1 = __importDefault(require("lodash.clonedeep"));
const Events_1 = __importDefault(require("../enums/Events"));
const ViewportStatus_1 = __importDefault(require("../enums/ViewportStatus"));
const renderingEngineCache_1 = __importDefault(require("./renderingEngineCache"));
const utilities_1 = require("../utilities");
const hasNaNValues_1 = __importDefault(require("../utilities/hasNaNValues"));
const constants_1 = require("../constants");
const init_1 = require("../init");
class Viewport {
    constructor(props) {
        this.flipHorizontal = false;
        this.flipVertical = false;
        this.viewportStatus = ViewportStatus_1.default.NO_DATA;
        this._suppressCameraModifiedEvents = false;
        this.hasPixelSpacing = true;
        this.id = props.id;
        this.renderingEngineId = props.renderingEngineId;
        this.type = props.type;
        this.element = props.element;
        this.canvas = props.canvas;
        this.sx = props.sx;
        this.sy = props.sy;
        this.sWidth = props.sWidth;
        this.sHeight = props.sHeight;
        this._actors = new Map();
        this.element.setAttribute('data-viewport-uid', this.id);
        this.element.setAttribute('data-rendering-engine-uid', this.renderingEngineId);
        this.defaultOptions = (0, lodash_clonedeep_1.default)(props.defaultOptions);
        this.suppressEvents = props.defaultOptions.suppressEvents
            ? props.defaultOptions.suppressEvents
            : false;
        this.options = (0, lodash_clonedeep_1.default)(props.defaultOptions);
        this.isDisabled = false;
    }
    static get useCustomRenderingPipeline() {
        return false;
    }
    setRendered() {
        if (this.viewportStatus === ViewportStatus_1.default.NO_DATA ||
            this.viewportStatus === ViewportStatus_1.default.LOADING) {
            return;
        }
        this.viewportStatus = ViewportStatus_1.default.RENDERED;
    }
    getRenderingEngine() {
        return renderingEngineCache_1.default.get(this.renderingEngineId);
    }
    getRenderer() {
        const renderingEngine = this.getRenderingEngine();
        if (!renderingEngine || renderingEngine.hasBeenDestroyed) {
            throw new Error('Rendering engine has been destroyed');
        }
        return renderingEngine.offscreenMultiRenderWindow.getRenderer(this.id);
    }
    render() {
        const renderingEngine = this.getRenderingEngine();
        renderingEngine.renderViewport(this.id);
    }
    setOptions(options, immediate = false) {
        var _a, _b;
        this.options = (0, lodash_clonedeep_1.default)(options);
        if ((_a = this.options) === null || _a === void 0 ? void 0 : _a.displayArea) {
            this.setDisplayArea((_b = this.options) === null || _b === void 0 ? void 0 : _b.displayArea);
        }
        if (immediate) {
            this.render();
        }
    }
    reset(immediate = false) {
        this.options = (0, lodash_clonedeep_1.default)(this.defaultOptions);
        if (immediate) {
            this.render();
        }
    }
    flip({ flipHorizontal, flipVertical }) {
        const imageData = this.getDefaultImageData();
        if (!imageData) {
            return;
        }
        const camera = this.getCamera();
        const { viewPlaneNormal, viewUp, focalPoint, position } = camera;
        const viewRight = gl_matrix_1.vec3.cross(gl_matrix_1.vec3.create(), viewPlaneNormal, viewUp);
        let viewUpToSet = gl_matrix_1.vec3.copy(gl_matrix_1.vec3.create(), viewUp);
        const viewPlaneNormalToSet = gl_matrix_1.vec3.negate(gl_matrix_1.vec3.create(), viewPlaneNormal);
        const distance = gl_matrix_1.vec3.distance(position, focalPoint);
        const dimensions = imageData.getDimensions();
        const middleIJK = dimensions.map((d) => Math.floor(d / 2));
        const idx = [middleIJK[0], middleIJK[1], middleIJK[2]];
        const centeredFocalPoint = imageData.indexToWorld(idx, gl_matrix_1.vec3.create());
        const resetFocalPoint = this._getFocalPointForResetCamera(centeredFocalPoint, camera, { resetPan: true, resetToCenter: false });
        const panDir = gl_matrix_1.vec3.subtract(gl_matrix_1.vec3.create(), focalPoint, resetFocalPoint);
        const panValue = gl_matrix_1.vec3.length(panDir);
        const getPanDir = (mirrorVec) => {
            const panDirMirror = gl_matrix_1.vec3.scale(gl_matrix_1.vec3.create(), mirrorVec, 2 * gl_matrix_1.vec3.dot(panDir, mirrorVec));
            gl_matrix_1.vec3.subtract(panDirMirror, panDirMirror, panDir);
            gl_matrix_1.vec3.normalize(panDirMirror, panDirMirror);
            return panDirMirror;
        };
        if (flipHorizontal) {
            const panDirMirror = getPanDir(viewUpToSet);
            const newFocalPoint = gl_matrix_1.vec3.scaleAndAdd(gl_matrix_1.vec3.create(), resetFocalPoint, panDirMirror, panValue);
            const newPosition = gl_matrix_1.vec3.scaleAndAdd(gl_matrix_1.vec3.create(), newFocalPoint, viewPlaneNormalToSet, distance);
            this.setCamera({
                viewPlaneNormal: viewPlaneNormalToSet,
                position: newPosition,
                focalPoint: newFocalPoint,
            });
            this.flipHorizontal = !this.flipHorizontal;
        }
        if (flipVertical) {
            viewUpToSet = gl_matrix_1.vec3.negate(viewUpToSet, viewUp);
            const panDirMirror = getPanDir(viewRight);
            const newFocalPoint = gl_matrix_1.vec3.scaleAndAdd(gl_matrix_1.vec3.create(), resetFocalPoint, panDirMirror, panValue);
            const newPosition = gl_matrix_1.vec3.scaleAndAdd(gl_matrix_1.vec3.create(), newFocalPoint, viewPlaneNormalToSet, distance);
            this.setCamera({
                focalPoint: newFocalPoint,
                viewPlaneNormal: viewPlaneNormalToSet,
                viewUp: viewUpToSet,
                position: newPosition,
            });
            this.flipVertical = !this.flipVertical;
        }
        this.render();
    }
    getDefaultImageData() {
        const actorEntry = this.getDefaultActor();
        if (actorEntry && (0, utilities_1.isImageActor)(actorEntry)) {
            return actorEntry.actor.getMapper().getInputData();
        }
    }
    getDefaultActor() {
        return this.getActors()[0];
    }
    getActors() {
        return Array.from(this._actors.values());
    }
    getActor(actorUID) {
        return this._actors.get(actorUID);
    }
    getActorUIDByIndex(index) {
        const actor = this.getActors()[index];
        if (actor) {
            return actor.uid;
        }
    }
    getActorByIndex(index) {
        return this.getActors()[index];
    }
    setActors(actors) {
        this.removeAllActors();
        const resetCameraPanAndZoom = true;
        this.addActors(actors, resetCameraPanAndZoom);
    }
    _removeActor(actorUID) {
        const actorEntry = this.getActor(actorUID);
        if (!actorEntry) {
            console.warn(`Actor ${actorUID} does not exist for this viewport`);
            return;
        }
        const renderer = this.getRenderer();
        renderer.removeViewProp(actorEntry.actor);
        this._actors.delete(actorUID);
    }
    removeActors(actorUIDs) {
        actorUIDs.forEach((actorUID) => {
            this._removeActor(actorUID);
        });
    }
    addActors(actors, resetCameraPanAndZoom = false) {
        const renderingEngine = this.getRenderingEngine();
        if (!renderingEngine || renderingEngine.hasBeenDestroyed) {
            console.warn('Viewport::addActors::Rendering engine has not been initialized or has been destroyed');
            return;
        }
        actors.forEach((actor) => this.addActor(actor));
        this.resetCamera(resetCameraPanAndZoom, resetCameraPanAndZoom);
    }
    addActor(actorEntry) {
        const { uid: actorUID, actor } = actorEntry;
        const renderingEngine = this.getRenderingEngine();
        if (!renderingEngine || renderingEngine.hasBeenDestroyed) {
            console.warn(`Cannot add actor UID of ${actorUID} Rendering Engine has been destroyed`);
            return;
        }
        if (!actorUID || !actor) {
            throw new Error('Actors should have uid and vtk Actor properties');
        }
        if (this.getActor(actorUID)) {
            console.warn(`Actor ${actorUID} already exists for this viewport`);
            return;
        }
        const renderer = this.getRenderer();
        renderer.addActor(actor);
        this._actors.set(actorUID, Object.assign({}, actorEntry));
    }
    removeAllActors() {
        this.getRenderer().removeAllViewProps();
        this._actors = new Map();
        return;
    }
    resetCameraNoEvent() {
        this._suppressCameraModifiedEvents = true;
        this.resetCamera();
        this._suppressCameraModifiedEvents = false;
    }
    setCameraNoEvent(camera) {
        this._suppressCameraModifiedEvents = true;
        this.setCamera(camera);
        this._suppressCameraModifiedEvents = false;
    }
    _getViewImageDataIntersections(imageData, focalPoint, normal) {
        const A = normal[0];
        const B = normal[1];
        const C = normal[2];
        const D = A * focalPoint[0] + B * focalPoint[1] + C * focalPoint[2];
        const bounds = imageData.getBounds();
        const edges = this._getEdges(bounds);
        const intersections = [];
        for (const edge of edges) {
            const [[x0, y0, z0], [x1, y1, z1]] = edge;
            if (A * (x1 - x0) + B * (y1 - y0) + C * (z1 - z0) === 0) {
                continue;
            }
            const intersectionPoint = utilities_1.planar.linePlaneIntersection([x0, y0, z0], [x1, y1, z1], [A, B, C, D]);
            if (this._isInBounds(intersectionPoint, bounds)) {
                intersections.push(intersectionPoint);
            }
        }
        return intersections;
    }
    setDisplayArea(displayArea, suppressEvents = false) {
        const { storeAsInitialCamera } = displayArea;
        this.setCamera(this.fitToCanvasCamera, false);
        const { imageArea, imageCanvasPoint } = displayArea;
        if (imageArea) {
            const [areaX, areaY] = imageArea;
            const zoom = Math.min(this.getZoom() / areaX, this.getZoom() / areaY);
            this.setZoom(zoom, storeAsInitialCamera);
        }
        const imageData = this.getDefaultImageData();
        if (imageCanvasPoint && imageData) {
            const { imagePoint, canvasPoint } = imageCanvasPoint;
            const [canvasX, canvasY] = canvasPoint;
            const devicePixelRatio = (window === null || window === void 0 ? void 0 : window.devicePixelRatio) || 1;
            const validateCanvasPanX = this.sWidth / devicePixelRatio;
            const validateCanvasPanY = this.sHeight / devicePixelRatio;
            const canvasPanX = validateCanvasPanX * (canvasX - 0.5);
            const canvasPanY = validateCanvasPanY * (canvasY - 0.5);
            const dimensions = imageData.getDimensions();
            const canvasZero = this.worldToCanvas([0, 0, 0]);
            const canvasEdge = this.worldToCanvas(dimensions);
            const canvasImage = [
                canvasEdge[0] - canvasZero[0],
                canvasEdge[1] - canvasZero[1],
            ];
            const [imgWidth, imgHeight] = canvasImage;
            const [imageX, imageY] = imagePoint;
            const imagePanX = imgWidth * (0.5 - imageX);
            const imagePanY = imgHeight * (0.5 - imageY);
            const newPositionX = imagePanX + canvasPanX;
            const newPositionY = imagePanY + canvasPanY;
            const deltaPoint2 = [newPositionX, newPositionY];
            this.setPan(deltaPoint2, storeAsInitialCamera);
        }
        if (storeAsInitialCamera) {
            this.options.displayArea = displayArea;
        }
        if (!suppressEvents) {
            const eventDetail = {
                viewportId: this.id,
                displayArea: displayArea,
                storeAsInitialCamera: storeAsInitialCamera,
            };
            (0, utilities_1.triggerEvent)(this.element, Events_1.default.DISPLAY_AREA_MODIFIED, eventDetail);
        }
    }
    getDisplayArea() {
        var _a;
        return (_a = this.options) === null || _a === void 0 ? void 0 : _a.displayArea;
    }
    resetCamera(resetPan = true, resetZoom = true, resetToCenter = true, storeAsInitialCamera = true) {
        var _a, _b;
        const renderer = this.getRenderer();
        this.setCamera({
            flipHorizontal: false,
            flipVertical: false,
        });
        const previousCamera = (0, lodash_clonedeep_1.default)(this.getCamera());
        const bounds = renderer.computeVisiblePropBounds();
        const focalPoint = [0, 0, 0];
        const imageData = this.getDefaultImageData();
        if (imageData) {
            const spc = imageData.getSpacing();
            bounds[0] = bounds[0] + spc[0] / 2;
            bounds[1] = bounds[1] - spc[0] / 2;
            bounds[2] = bounds[2] + spc[1] / 2;
            bounds[3] = bounds[3] - spc[1] / 2;
            bounds[4] = bounds[4] + spc[2] / 2;
            bounds[5] = bounds[5] - spc[2] / 2;
        }
        const activeCamera = this.getVtkActiveCamera();
        const viewPlaneNormal = activeCamera.getViewPlaneNormal();
        const viewUp = activeCamera.getViewUp();
        focalPoint[0] = (bounds[0] + bounds[1]) / 2.0;
        focalPoint[1] = (bounds[2] + bounds[3]) / 2.0;
        focalPoint[2] = (bounds[4] + bounds[5]) / 2.0;
        if (imageData) {
            const dimensions = imageData.getDimensions();
            const middleIJK = dimensions.map((d) => Math.floor(d / 2));
            const idx = [middleIJK[0], middleIJK[1], middleIJK[2]];
            imageData.indexToWorld(idx, focalPoint);
        }
        const { widthWorld, heightWorld } = this._getWorldDistanceViewUpAndViewRight(bounds, viewUp, viewPlaneNormal);
        const canvasSize = [this.sWidth, this.sHeight];
        const boundsAspectRatio = widthWorld / heightWorld;
        const canvasAspectRatio = canvasSize[0] / canvasSize[1];
        let radius;
        if (boundsAspectRatio < canvasAspectRatio) {
            radius = heightWorld / 2;
        }
        else {
            const scaleFactor = boundsAspectRatio / canvasAspectRatio;
            radius = (heightWorld * scaleFactor) / 2;
        }
        const parallelScale = 1.1 * radius;
        let w1 = bounds[1] - bounds[0];
        let w2 = bounds[3] - bounds[2];
        let w3 = bounds[5] - bounds[4];
        w1 *= w1;
        w2 *= w2;
        w3 *= w3;
        radius = w1 + w2 + w3;
        radius = radius === 0 ? 1.0 : radius;
        radius = Math.sqrt(radius) * 0.5;
        const distance = 1.1 * radius;
        const viewUpToSet = Math.abs(Math_1.default.dot(viewUp, viewPlaneNormal)) > 0.999
            ? [-viewUp[2], viewUp[0], viewUp[1]]
            : viewUp;
        const focalPointToSet = this._getFocalPointForResetCamera(focalPoint, previousCamera, { resetPan, resetToCenter });
        const positionToSet = [
            focalPointToSet[0] + distance * viewPlaneNormal[0],
            focalPointToSet[1] + distance * viewPlaneNormal[1],
            focalPointToSet[2] + distance * viewPlaneNormal[2],
        ];
        renderer.resetCameraClippingRange(bounds);
        const clippingRangeToUse = [
            -constants_1.RENDERING_DEFAULTS.MAXIMUM_RAY_DISTANCE,
            constants_1.RENDERING_DEFAULTS.MAXIMUM_RAY_DISTANCE,
        ];
        activeCamera.setPhysicalScale(radius);
        activeCamera.setPhysicalTranslation(-focalPointToSet[0], -focalPointToSet[1], -focalPointToSet[2]);
        this.setCamera({
            parallelScale: resetZoom ? parallelScale : previousCamera.parallelScale,
            focalPoint: focalPointToSet,
            position: positionToSet,
            viewAngle: 90,
            viewUp: viewUpToSet,
            clippingRange: clippingRangeToUse,
        });
        const modifiedCamera = (0, lodash_clonedeep_1.default)(this.getCamera());
        this.setFitToCanvasCamera((0, lodash_clonedeep_1.default)(this.getCamera()));
        if (storeAsInitialCamera) {
            this.setInitialCamera(modifiedCamera);
        }
        const RESET_CAMERA_EVENT = {
            type: 'ResetCameraEvent',
            renderer,
        };
        renderer.invokeEvent(RESET_CAMERA_EVENT);
        this.triggerCameraModifiedEventIfNecessary(previousCamera, modifiedCamera);
        if (imageData &&
            ((_a = this.options) === null || _a === void 0 ? void 0 : _a.displayArea) &&
            resetZoom &&
            resetPan &&
            resetToCenter) {
            this.setDisplayArea((_b = this.options) === null || _b === void 0 ? void 0 : _b.displayArea);
        }
        return true;
    }
    setInitialCamera(camera) {
        this.initialCamera = camera;
    }
    setFitToCanvasCamera(camera) {
        this.fitToCanvasCamera = camera;
    }
    getPan() {
        const activeCamera = this.getVtkActiveCamera();
        const focalPoint = activeCamera.getFocalPoint();
        const zero3 = this.canvasToWorld([0, 0]);
        const initialCanvasFocal = this.worldToCanvas(gl_matrix_1.vec3.subtract(gl_matrix_1.vec3.create(), this.initialCamera.focalPoint, zero3));
        const currentCanvasFocal = this.worldToCanvas(gl_matrix_1.vec3.subtract(gl_matrix_1.vec3.create(), focalPoint, zero3));
        const result = (gl_matrix_1.vec2.subtract(gl_matrix_1.vec2.create(), initialCanvasFocal, currentCanvasFocal));
        return result;
    }
    setPan(pan, storeAsInitialCamera = false) {
        const previousCamera = this.getCamera();
        const { focalPoint, position } = previousCamera;
        const zero3 = this.canvasToWorld([0, 0]);
        const delta2 = gl_matrix_1.vec2.subtract(gl_matrix_1.vec2.create(), pan, this.getPan());
        if (Math.abs(delta2[0]) < 1 &&
            Math.abs(delta2[1]) < 1 &&
            !storeAsInitialCamera) {
            return;
        }
        const delta = gl_matrix_1.vec3.subtract(gl_matrix_1.vec3.create(), this.canvasToWorld(delta2), zero3);
        const newFocal = gl_matrix_1.vec3.subtract(gl_matrix_1.vec3.create(), focalPoint, delta);
        const newPosition = gl_matrix_1.vec3.subtract(gl_matrix_1.vec3.create(), position, delta);
        this.setCamera(Object.assign(Object.assign({}, previousCamera), { focalPoint: newFocal, position: newPosition }), storeAsInitialCamera);
    }
    getZoom() {
        const activeCamera = this.getVtkActiveCamera();
        const { parallelScale: initialParallelScale } = this.initialCamera;
        return initialParallelScale / activeCamera.getParallelScale();
    }
    setZoom(value, storeAsInitialCamera = false) {
        const camera = this.getCamera();
        const { parallelScale: initialParallelScale } = this.initialCamera;
        const parallelScale = initialParallelScale / value;
        if (camera.parallelScale === parallelScale && !storeAsInitialCamera) {
            return;
        }
        this.setCamera(Object.assign(Object.assign({}, camera), { parallelScale }), storeAsInitialCamera);
    }
    _getFocalPointForViewPlaneReset(imageData) {
        const { focalPoint, viewPlaneNormal: normal } = this.getCamera();
        const intersections = this._getViewImageDataIntersections(imageData, focalPoint, normal);
        let x = 0;
        let y = 0;
        let z = 0;
        intersections.forEach(([point_x, point_y, point_z]) => {
            x += point_x;
            y += point_y;
            z += point_z;
        });
        const newFocalPoint = [
            x / intersections.length,
            y / intersections.length,
            z / intersections.length,
        ];
        return newFocalPoint;
    }
    getCanvas() {
        return this.canvas;
    }
    getVtkActiveCamera() {
        const renderer = this.getRenderer();
        return renderer.getActiveCamera();
    }
    getCamera() {
        const vtkCamera = this.getVtkActiveCamera();
        return {
            viewUp: vtkCamera.getViewUp(),
            viewPlaneNormal: vtkCamera.getViewPlaneNormal(),
            position: vtkCamera.getPosition(),
            focalPoint: vtkCamera.getFocalPoint(),
            parallelProjection: vtkCamera.getParallelProjection(),
            parallelScale: vtkCamera.getParallelScale(),
            viewAngle: vtkCamera.getViewAngle(),
            flipHorizontal: this.flipHorizontal,
            flipVertical: this.flipVertical,
        };
    }
    setCamera(cameraInterface, storeAsInitialCamera = false) {
        const vtkCamera = this.getVtkActiveCamera();
        const previousCamera = (0, lodash_clonedeep_1.default)(this.getCamera());
        const updatedCamera = Object.assign({}, previousCamera, cameraInterface);
        const { viewUp, viewPlaneNormal, position, focalPoint, parallelScale, viewAngle, flipHorizontal, flipVertical, clippingRange, } = cameraInterface;
        if (flipHorizontal !== undefined) {
            const flipH = (flipHorizontal && !this.flipHorizontal) ||
                (!flipHorizontal && this.flipHorizontal);
            if (flipH) {
                this.flip({ flipHorizontal: flipH });
            }
        }
        if (flipVertical !== undefined) {
            const flipV = (flipVertical && !this.flipVertical) ||
                (!flipVertical && this.flipVertical);
            if (flipV) {
                this.flip({ flipVertical: flipV });
            }
        }
        if (viewUp !== undefined) {
            vtkCamera.setViewUp(viewUp);
        }
        if (viewPlaneNormal !== undefined) {
            vtkCamera.setDirectionOfProjection(-viewPlaneNormal[0], -viewPlaneNormal[1], -viewPlaneNormal[2]);
        }
        if (position !== undefined) {
            vtkCamera.setPosition(...position);
        }
        if (focalPoint !== undefined) {
            vtkCamera.setFocalPoint(...focalPoint);
        }
        if (parallelScale !== undefined) {
            vtkCamera.setParallelScale(parallelScale);
        }
        if (viewAngle !== undefined) {
            vtkCamera.setViewAngle(viewAngle);
        }
        if (clippingRange !== undefined) {
            vtkCamera.setClippingRange(clippingRange);
        }
        const actorEntry = this.getDefaultActor();
        if (!actorEntry || !actorEntry.actor) {
            return;
        }
        const isImageSlice = (0, utilities_1.actorIsA)(actorEntry, 'vtkImageSlice');
        if (!isImageSlice) {
            this.updateClippingPlanesForActors(updatedCamera);
        }
        else {
            const renderer = this.getRenderer();
            renderer.resetCameraClippingRange();
        }
        if (storeAsInitialCamera) {
            this.setInitialCamera(updatedCamera);
        }
        this.triggerCameraModifiedEventIfNecessary(previousCamera, this.getCamera());
    }
    triggerCameraModifiedEventIfNecessary(previousCamera, updatedCamera) {
        if (!this._suppressCameraModifiedEvents && !this.suppressEvents) {
            const eventDetail = {
                previousCamera,
                camera: updatedCamera,
                element: this.element,
                viewportId: this.id,
                renderingEngineId: this.renderingEngineId,
                rotation: this.getRotation(),
            };
            (0, utilities_1.triggerEvent)(this.element, Events_1.default.CAMERA_MODIFIED, eventDetail);
        }
    }
    updateClippingPlanesForActors(updatedCamera) {
        const actorEntries = this.getActors();
        actorEntries.forEach((actorEntry) => {
            if (!actorEntry.actor) {
                return;
            }
            const mapper = actorEntry.actor.getMapper();
            const vtkPlanes = mapper.getClippingPlanes();
            let slabThickness = constants_1.RENDERING_DEFAULTS.MINIMUM_SLAB_THICKNESS;
            if (actorEntry.slabThickness) {
                slabThickness = actorEntry.slabThickness;
            }
            const { viewPlaneNormal, focalPoint } = updatedCamera;
            this.setOrientationOfClippingPlanes(vtkPlanes, slabThickness, viewPlaneNormal, focalPoint);
        });
    }
    setOrientationOfClippingPlanes(vtkPlanes, slabThickness, viewPlaneNormal, focalPoint) {
        if (vtkPlanes.length < 2) {
            return;
        }
        const scaledDistance = [
            viewPlaneNormal[0],
            viewPlaneNormal[1],
            viewPlaneNormal[2],
        ];
        Math_1.default.multiplyScalar(scaledDistance, slabThickness);
        vtkPlanes[0].setNormal(viewPlaneNormal);
        const newOrigin1 = [0, 0, 0];
        Math_1.default.subtract(focalPoint, scaledDistance, newOrigin1);
        vtkPlanes[0].setOrigin(newOrigin1);
        vtkPlanes[1].setNormal(-viewPlaneNormal[0], -viewPlaneNormal[1], -viewPlaneNormal[2]);
        const newOrigin2 = [0, 0, 0];
        Math_1.default.add(focalPoint, scaledDistance, newOrigin2);
        vtkPlanes[1].setOrigin(newOrigin2);
    }
    _getWorldDistanceViewUpAndViewRight(bounds, viewUp, viewPlaneNormal) {
        const viewUpCorners = this._getCorners(bounds);
        const viewRightCorners = this._getCorners(bounds);
        const viewRight = gl_matrix_1.vec3.cross(gl_matrix_1.vec3.create(), viewUp, viewPlaneNormal);
        let transform = MatrixBuilder_1.default
            .buildFromDegree()
            .identity()
            .rotateFromDirections(viewUp, [1, 0, 0]);
        viewUpCorners.forEach((pt) => transform.apply(pt));
        let minY = Infinity;
        let maxY = -Infinity;
        for (let i = 0; i < 8; i++) {
            const y = viewUpCorners[i][0];
            if (y > maxY) {
                maxY = y;
            }
            if (y < minY) {
                minY = y;
            }
        }
        transform = MatrixBuilder_1.default
            .buildFromDegree()
            .identity()
            .rotateFromDirections([viewRight[0], viewRight[1], viewRight[2]], [1, 0, 0]);
        viewRightCorners.forEach((pt) => transform.apply(pt));
        let minX = Infinity;
        let maxX = -Infinity;
        for (let i = 0; i < 8; i++) {
            const x = viewRightCorners[i][0];
            if (x > maxX) {
                maxX = x;
            }
            if (x < minX) {
                minX = x;
            }
        }
        return { widthWorld: maxX - minX, heightWorld: maxY - minY };
    }
    _shouldUseNativeDataType() {
        const { useNorm16Texture, preferSizeOverAccuracy } = (0, init_1.getConfiguration)().rendering;
        return useNorm16Texture || preferSizeOverAccuracy;
    }
    _getCorners(bounds) {
        return [
            [bounds[0], bounds[2], bounds[4]],
            [bounds[0], bounds[2], bounds[5]],
            [bounds[0], bounds[3], bounds[4]],
            [bounds[0], bounds[3], bounds[5]],
            [bounds[1], bounds[2], bounds[4]],
            [bounds[1], bounds[2], bounds[5]],
            [bounds[1], bounds[3], bounds[4]],
            [bounds[1], bounds[3], bounds[5]],
        ];
    }
    _getFocalPointForResetCamera(centeredFocalPoint, previousCamera, { resetPan = true, resetToCenter = true }) {
        if (resetToCenter && resetPan) {
            return centeredFocalPoint;
        }
        if (resetToCenter && !resetPan) {
            return (0, hasNaNValues_1.default)(previousCamera.focalPoint)
                ? centeredFocalPoint
                : previousCamera.focalPoint;
        }
        if (!resetToCenter && resetPan) {
            const oldCamera = previousCamera;
            const oldFocalPoint = oldCamera.focalPoint;
            const oldViewPlaneNormal = oldCamera.viewPlaneNormal;
            const vectorFromOldFocalPointToCenteredFocalPoint = gl_matrix_1.vec3.subtract(gl_matrix_1.vec3.create(), centeredFocalPoint, oldFocalPoint);
            const distanceFromOldFocalPointToCenteredFocalPoint = gl_matrix_1.vec3.dot(vectorFromOldFocalPointToCenteredFocalPoint, oldViewPlaneNormal);
            const newFocalPoint = gl_matrix_1.vec3.scaleAndAdd(gl_matrix_1.vec3.create(), centeredFocalPoint, oldViewPlaneNormal, -1 * distanceFromOldFocalPointToCenteredFocalPoint);
            return [newFocalPoint[0], newFocalPoint[1], newFocalPoint[2]];
        }
        if (!resetPan && !resetToCenter) {
            return (0, hasNaNValues_1.default)(previousCamera.focalPoint)
                ? centeredFocalPoint
                : previousCamera.focalPoint;
        }
    }
    _isInBounds(point, bounds) {
        const [xMin, xMax, yMin, yMax, zMin, zMax] = bounds;
        const [x, y, z] = point;
        if (x < xMin || x > xMax || y < yMin || y > yMax || z < zMin || z > zMax) {
            return false;
        }
        return true;
    }
    _getEdges(bounds) {
        const [p1, p2, p3, p4, p5, p6, p7, p8] = this._getCorners(bounds);
        return [
            [p1, p2],
            [p1, p5],
            [p1, p3],
            [p2, p4],
            [p2, p6],
            [p3, p4],
            [p3, p7],
            [p4, p8],
            [p5, p7],
            [p5, p6],
            [p6, p8],
            [p7, p8],
        ];
    }
}
exports.default = Viewport;
//# sourceMappingURL=Viewport.js.map