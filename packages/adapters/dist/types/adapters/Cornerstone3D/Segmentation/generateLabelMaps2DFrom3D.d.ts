/**
 * Generates 2D label maps from a 3D label map.
 * @param labelmap3D - The 3D label map object to generate 2D label maps from. It is derived
 * from the volume labelmap.
 * @returns The label map object containing the 2D label maps and segments on label maps.
 */
declare function generateLabelMaps2DFrom3D(labelmap3D: any): {
    scalarData: number[];
    dimensions: number[];
    segmentsOnLabelmap: number[];
    labelmaps2D: {
        segmentsOnLabelmap: number[];
        pixelData: number[];
        rows: number;
        columns: number;
    }[];
};
export { generateLabelMaps2DFrom3D };
