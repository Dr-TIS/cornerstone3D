"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getOrientationStringLPS(vector) {
    let orientation = '';
    const orientationX = vector[0] < 0 ? 'R' : 'L';
    const orientationY = vector[1] < 0 ? 'A' : 'P';
    const orientationZ = vector[2] < 0 ? 'F' : 'H';
    const abs = [Math.abs(vector[0]), Math.abs(vector[1]), Math.abs(vector[2])];
    const MIN = 0.0001;
    for (let i = 0; i < 3; i++) {
        if (abs[0] > MIN && abs[0] > abs[1] && abs[0] > abs[2]) {
            orientation += orientationX;
            abs[0] = 0;
        }
        else if (abs[1] > MIN && abs[1] > abs[0] && abs[1] > abs[2]) {
            orientation += orientationY;
            abs[1] = 0;
        }
        else if (abs[2] > MIN && abs[2] > abs[0] && abs[2] > abs[1]) {
            orientation += orientationZ;
            abs[2] = 0;
        }
        else if (abs[0] > MIN && abs[1] > MIN && abs[0] === abs[1]) {
            orientation += orientationX + orientationY;
            abs[0] = 0;
            abs[1] = 0;
        }
        else if (abs[0] > MIN && abs[2] > MIN && abs[0] === abs[2]) {
            orientation += orientationX + orientationZ;
            abs[0] = 0;
            abs[2] = 0;
        }
        else if (abs[1] > MIN && abs[2] > MIN && abs[1] === abs[2]) {
            orientation += orientationY + orientationZ;
            abs[1] = 0;
            abs[2] = 0;
        }
        else {
            break;
        }
    }
    return orientation;
}
exports.default = getOrientationStringLPS;
//# sourceMappingURL=getOrientationStringLPS.js.map