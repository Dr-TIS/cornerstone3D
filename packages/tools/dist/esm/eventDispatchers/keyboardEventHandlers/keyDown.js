import { ToolGroupManager } from '../../store';
import getActiveToolForKeyboardEvent from '../shared/getActiveToolForKeyboardEvent';
export default function keyDown(evt) {
    const activeTool = getActiveToolForKeyboardEvent(evt);
    if (!activeTool) {
        return;
    }
    const { renderingEngineId, viewportId } = evt.detail;
    const toolGroup = ToolGroupManager.getToolGroupForViewport(viewportId, renderingEngineId);
    const toolName = activeTool.getToolName();
    if (Object.keys(toolGroup.toolOptions).includes(toolName)) {
        toolGroup.setViewportsCursorByToolName(toolName);
    }
}
//# sourceMappingURL=keyDown.js.map