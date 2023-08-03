import type { Types } from '@cornerstonejs/core';
import AnnotationDisplayTool from './AnnotationDisplayTool';
import { Annotation, Annotations, EventTypes, ToolHandle, InteractionTypes } from '../../types';
import { StyleSpecifier } from '../../types/AnnotationStyle';
declare abstract class AnnotationTool extends AnnotationDisplayTool {
    static toolName: any;
    abstract addNewAnnotation(evt: EventTypes.InteractionEventType, interactionType: InteractionTypes): Annotation;
    abstract cancel(element: HTMLDivElement): any;
    abstract handleSelectedCallback(evt: EventTypes.InteractionEventType, annotation: Annotation, handle: ToolHandle, interactionType: InteractionTypes): void;
    abstract toolSelectedCallback(evt: EventTypes.InteractionEventType, annotation: Annotation, interactionType: InteractionTypes): void;
    abstract isPointNearTool(element: HTMLDivElement, annotation: Annotation, canvasCoords: Types.Point2, proximity: number, interactionType: string): boolean;
    mouseMoveCallback: (evt: EventTypes.MouseMoveEventType, filteredAnnotations?: Annotations) => boolean;
    getHandleNearImagePoint(element: HTMLDivElement, annotation: Annotation, canvasCoords: Types.Point2, proximity: number): ToolHandle | undefined;
    getLinkedTextBoxStyle(specifications: StyleSpecifier, annotation?: Annotation): Record<string, unknown>;
    isSuvScaled(viewport: Types.IStackViewport | Types.IVolumeViewport, targetId: string, imageId?: string): boolean;
    private _imagePointNearToolOrHandle;
}
export default AnnotationTool;
