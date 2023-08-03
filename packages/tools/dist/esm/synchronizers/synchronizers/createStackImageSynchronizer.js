import { createSynchronizer } from '../../store/SynchronizerManager';
import { Enums } from '@cornerstonejs/core';
import stackImageSyncCallback from '../callbacks/stackImageSyncCallback';
const { STACK_NEW_IMAGE } = Enums.Events;
export default function createStackImageSynchronizer(synchronizerName) {
    const stackImageSynchronizer = createSynchronizer(synchronizerName, STACK_NEW_IMAGE, stackImageSyncCallback);
    return stackImageSynchronizer;
}
//# sourceMappingURL=createStackImageSynchronizer.js.map