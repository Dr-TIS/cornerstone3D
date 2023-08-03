import isValidCornerstoneTrackingIdentifier from "./isValidCornerstoneTrackingIdentifier";
declare class CircleROI {
    static trackingIdentifierTextValue: string;
    static toolType: string;
    static utilityToolType: string;
    static TID300Representation: any;
    static isValidCornerstoneTrackingIdentifier: typeof isValidCornerstoneTrackingIdentifier;
    /** Gets the measurement data for cornerstone, given DICOM SR measurement data. */
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
    /**
     * Gets the TID 300 representation of a circle, given the cornerstone representation.
     *
     * @param {Object} tool
     * @returns
     */
    static getTID300RepresentationArguments(tool: any, worldToImageCoords: any): {
        area: any;
        perimeter: number;
        radius: any;
        points: any[];
        trackingIdentifierTextValue: string;
        finding: any;
        findingSites: any;
    };
}
export default CircleROI;
