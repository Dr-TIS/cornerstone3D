import { BaseVolumeViewport, getEnabledElement, } from '@cornerstonejs/core';
import { mat4, vec3 } from 'gl-matrix';
import { BaseTool } from './base';
import angleBetweenLines from '../utilities/math/angle/angleBetweenLines';
class PlanarRotateTool extends BaseTool {
    constructor(toolProps = {}, defaultToolProps = {
        supportedInteractionTypes: ['Mouse', 'Touch'],
    }) {
        super(toolProps, defaultToolProps);
        this.touchDragCallback = this._dragCallback.bind(this);
        this.mouseDragCallback = this._dragCallback.bind(this);
    }
    _dragCallback(evt) {
        const { element, currentPoints, startPoints } = evt.detail;
        const currentPointWorld = currentPoints.world;
        const startPointWorld = startPoints.world;
        const enabledElement = getEnabledElement(element);
        const { viewport } = enabledElement;
        const camera = viewport.getCamera();
        const width = element.clientWidth;
        const height = element.clientHeight;
        const centerCanvas = [width * 0.5, height * 0.5];
        const centerWorld = viewport.canvasToWorld(centerCanvas);
        let angle = angleBetweenLines([startPointWorld, centerWorld], [centerWorld, currentPointWorld]);
        const { viewPlaneNormal, viewUp } = camera;
        const v1 = vec3.sub(vec3.create(), centerWorld, startPointWorld);
        const v2 = vec3.sub(vec3.create(), centerWorld, currentPointWorld);
        const cross = vec3.cross(vec3.create(), v1, v2);
        if (vec3.dot(viewPlaneNormal, cross) > 0) {
            angle = -angle;
        }
        if (Number.isNaN(angle))
            return;
        if (viewport instanceof BaseVolumeViewport) {
            const rotAngle = (angle * Math.PI) / 180;
            const rotMat = mat4.identity(new Float32Array(16));
            mat4.rotate(rotMat, rotMat, rotAngle, viewPlaneNormal);
            const rotatedViewUp = vec3.transformMat4(vec3.create(), viewUp, rotMat);
            viewport.setCamera({ viewUp: rotatedViewUp });
        }
        else {
            const { rotation } = viewport.getProperties();
            viewport.setProperties({ rotation: rotation + angle });
        }
        viewport.render();
    }
}
PlanarRotateTool.toolName = 'PlanarRotate';
export default PlanarRotateTool;
//# sourceMappingURL=PlanarRotateTool.js.map