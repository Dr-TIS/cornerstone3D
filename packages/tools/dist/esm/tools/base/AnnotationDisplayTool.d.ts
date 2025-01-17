import type { Types } from '@cornerstonejs/core';
import BaseTool from './BaseTool';
import { Annotation, Annotations, SVGDrawingHelper } from '../../types';
import { StyleSpecifier } from '../../types/AnnotationStyle';
declare abstract class AnnotationDisplayTool extends BaseTool {
    static toolName: any;
    abstract renderAnnotation(enabledElement: Types.IEnabledElement, svgDrawingHelper: SVGDrawingHelper): any;
    filterInteractableAnnotationsForElement(element: HTMLDivElement, annotations: Annotations): Annotations | undefined;
    onImageSpacingCalibrated: (evt: Types.EventTypes.ImageSpacingCalibratedEvent) => void;
    protected getReferencedImageId(viewport: Types.IStackViewport | Types.IVolumeViewport, worldPos: Types.Point3, viewPlaneNormal: Types.Point3, viewUp: Types.Point3): string;
    getStyle(property: string, specifications: StyleSpecifier, annotation?: Annotation): unknown;
}
export default AnnotationDisplayTool;
