import { vec3 } from 'gl-matrix';
export default function getWorldWidthAndHeightFromTwoPoints(viewPlaneNormal, viewUp, worldPos1, worldPos2) {
    const viewRight = vec3.create();
    vec3.cross(viewRight, viewUp, viewPlaneNormal);
    const pos1 = vec3.fromValues(...worldPos1);
    const pos2 = vec3.fromValues(...worldPos2);
    const diagonal = vec3.create();
    vec3.subtract(diagonal, pos1, pos2);
    const diagonalLength = vec3.length(diagonal);
    if (diagonalLength < 0.0001) {
        return { worldWidth: 0, worldHeight: 0 };
    }
    const cosTheta = vec3.dot(diagonal, viewRight) / (diagonalLength * vec3.length(viewRight));
    const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
    const worldWidth = sinTheta * diagonalLength;
    const worldHeight = cosTheta * diagonalLength;
    return { worldWidth, worldHeight };
}
//# sourceMappingURL=getWorldWidthAndHeightFromTwoPoints.js.map