import isValidCornerstoneTrackingIdentifier from "./isValidCornerstoneTrackingIdentifier";
declare class EllipticalROI {
    static trackingIdentifierTextValue: string;
    static toolType: string;
    static utilityToolType: string;
    static TID300Representation: any;
    static isValidCornerstoneTrackingIdentifier: typeof isValidCornerstoneTrackingIdentifier;
    static getMeasurementData(MeasurementGroup: any, sopInstanceUIDToImageIdMap: any, imageToWorldCoords: any, metadata: any): {
        description: any;
        sopInstanceUid: any;
        annotation: {
            annotationUID: any;
            metadata: {
                toolName: any;
                referencedImageId: any;
                FrameOfReferenceUID: any;
                label: string;
            };
            data: any;
        };
        finding: any;
        findingSites: any[];
    };
    static getTID300RepresentationArguments(tool: any, worldToImageCoords: any): {
        area: any;
        points: any[];
        trackingIdentifierTextValue: string;
        finding: any;
        findingSites: any;
    };
}
export default EllipticalROI;
