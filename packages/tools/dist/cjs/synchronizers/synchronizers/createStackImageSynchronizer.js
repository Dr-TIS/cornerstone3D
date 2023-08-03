"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const SynchronizerManager_1 = require("../../store/SynchronizerManager");
const core_1 = require("@cornerstonejs/core");
const stackImageSyncCallback_1 = __importDefault(require("../callbacks/stackImageSyncCallback"));
const { STACK_NEW_IMAGE } = core_1.Enums.Events;
function createStackImageSynchronizer(synchronizerName) {
    const stackImageSynchronizer = (0, SynchronizerManager_1.createSynchronizer)(synchronizerName, STACK_NEW_IMAGE, stackImageSyncCallback_1.default);
    return stackImageSynchronizer;
}
exports.default = createStackImageSynchronizer;
//# sourceMappingURL=createStackImageSynchronizer.js.map