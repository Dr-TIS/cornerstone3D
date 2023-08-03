"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.point = exports.polyline = exports.rectangle = exports.lineSegment = exports.ellipse = exports.vec2 = void 0;
const vec2 = __importStar(require("./vec2"));
exports.vec2 = vec2;
const ellipse = __importStar(require("./ellipse"));
exports.ellipse = ellipse;
const lineSegment = __importStar(require("./line"));
exports.lineSegment = lineSegment;
const rectangle = __importStar(require("./rectangle"));
exports.rectangle = rectangle;
const polyline = __importStar(require("./polyline"));
exports.polyline = polyline;
const point = __importStar(require("./point"));
exports.point = point;
//# sourceMappingURL=index.js.map