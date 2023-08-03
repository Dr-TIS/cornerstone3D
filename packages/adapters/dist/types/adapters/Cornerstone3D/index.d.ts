import MeasurementReport from "./MeasurementReport";
import Bidirectional from "./Bidirectional";
import Angle from "./Angle";
import CobbAngle from "./CobbAngle";
import CircleROI from "./CircleROI";
import EllipticalROI from "./EllipticalROI";
import RectangleROI from "./RectangleROI";
import PlanarFreehandROI from "./PlanarFreehandROI";
import * as Segmentation from "./Segmentation";
declare const Cornerstone3DSR: {
    Bidirectional: typeof Bidirectional;
    CobbAngle: typeof CobbAngle;
    Angle: typeof Angle;
    Length: any;
    CircleROI: typeof CircleROI;
    EllipticalROI: typeof EllipticalROI;
    RectangleROI: typeof RectangleROI;
    ArrowAnnotate: any;
    Probe: any;
    PlanarFreehandROI: typeof PlanarFreehandROI;
    MeasurementReport: typeof MeasurementReport;
    CodeScheme: any;
    CORNERSTONE_3D_TAG: any;
};
declare const Cornerstone3DSEG: {
    Segmentation: typeof Segmentation;
};
export { Cornerstone3DSR, Cornerstone3DSEG };
