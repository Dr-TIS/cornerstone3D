import * as Enums from "./enums";
import * as helpers from "./helpers";
declare const adaptersSR: {
    Cornerstone: {
        Length: any;
        FreehandRoi: any;
        Bidirectional: any;
        EllipticalRoi: any;
        CircleRoi: any;
        ArrowAnnotate: any;
        MeasurementReport: any;
        CobbAngle: any;
        Angle: any;
        RectangleRoi: any;
    };
    Cornerstone3D: {
        Bidirectional: typeof import("./Cornerstone3D/Bidirectional").default;
        CobbAngle: typeof import("./Cornerstone3D/CobbAngle").default;
        Angle: typeof import("./Cornerstone3D/Angle").default;
        Length: any;
        CircleROI: typeof import("./Cornerstone3D/CircleROI").default;
        EllipticalROI: typeof import("./Cornerstone3D/EllipticalROI").default;
        RectangleROI: typeof import("./Cornerstone3D/RectangleROI").default;
        ArrowAnnotate: any;
        Probe: any;
        PlanarFreehandROI: typeof import("./Cornerstone3D/PlanarFreehandROI").default;
        MeasurementReport: typeof import("./Cornerstone3D/MeasurementReport").default;
        CodeScheme: any;
        CORNERSTONE_3D_TAG: any;
    };
};
declare const adaptersSEG: {
    Cornerstone: {
        Length: any;
        FreehandRoi: any;
        Bidirectional: any;
        EllipticalRoi: any;
        CircleRoi: any;
        ArrowAnnotate: any;
        MeasurementReport: any;
        CobbAngle: any;
        Angle: any;
        RectangleRoi: any;
    };
    Cornerstone3D: {
        Segmentation: typeof import("./Cornerstone3D/Segmentation");
    };
    VTKjs: {
        Segmentation: any;
    };
};
export { adaptersSR, adaptersSEG, Enums, helpers };
