export default class MeasurementReport {
    static CORNERSTONE_3D_TAG: any;
    static MEASUREMENT_BY_TOOLTYPE: {};
    static CORNERSTONE_TOOL_CLASSES_BY_UTILITY_TYPE: {};
    static CORNERSTONE_TOOL_CLASSES_BY_TOOL_TYPE: {};
    static getCornerstoneLabelFromDefaultState(defaultState: any): any;
    static generateDatasetMeta(): {
        FileMetaInformationVersion: {
            Value: ArrayBufferLike[];
            vr: string;
        };
        TransferSyntaxUID: {
            Value: string[];
            vr: string;
        };
        ImplementationClassUID: {
            Value: any[];
            vr: string;
        };
        ImplementationVersionName: {
            Value: string[];
            vr: string;
        };
    };
    static generateDerivationSourceDataset: (instance: any) => any;
    static getSetupMeasurementData(MeasurementGroup: any, sopInstanceUIDToImageIdMap: any, metadata: any, toolType: any): {
        defaultState: {
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
        NUMGroup: any;
        SCOORDGroup: any;
        ReferencedSOPSequence: any;
        ReferencedSOPInstanceUID: any;
        ReferencedFrameNumber: any;
    };
    static generateReport(toolState: any, metadataProvider: any, worldToImageCoords: any, options: any): any;
    /**
     * Generate Cornerstone tool state from dataset
     */
    static generateToolState(dataset: any, sopInstanceUIDToImageIdMap: any, imageToWorldCoords: any, metadata: any, hooks: any): {};
    /**
     * Register a new tool type.
     * @param toolClass to perform I/O to DICOM for this tool
     */
    static registerTool(toolClass: any): void;
}
