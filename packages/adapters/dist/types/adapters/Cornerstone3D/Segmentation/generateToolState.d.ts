/**
 * generateToolState - Given a set of cornerstoneTools imageIds and a Segmentation buffer,
 * derive cornerstoneTools toolState and brush metadata.
 *
 * @param   imageIds - An array of the imageIds.
 * @param   arrayBuffer - The SEG arrayBuffer.
 * @param   skipOverlapping - skip checks for overlapping segs, default value false.
 * @param   tolerance - default value 1.e-3.
 *
 * @returns a list of array buffer for each labelMap
 *  an object from which the segment metadata can be derived
 *  list containing the track of segments per frame
 *  list containing the track of segments per frame for each labelMap                   (available only for the overlapping case).
 */
declare function generateToolState(imageIds: any, arrayBuffer: any, metadataProvider: any, skipOverlapping?: boolean, tolerance?: number): any;
export { generateToolState };
