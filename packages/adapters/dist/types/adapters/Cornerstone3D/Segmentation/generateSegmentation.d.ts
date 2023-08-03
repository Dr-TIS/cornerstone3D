/**
 * generateSegmentation - Generates a DICOM Segmentation object given cornerstoneTools data.
 *
 * @param images - An array of the cornerstone image objects, which includes imageId and metadata
 * @param labelmaps - An array of the 3D Volumes that contain the segmentation data.
 */
declare function generateSegmentation(images: any, labelmaps: any, metadata: any, options: any): any;
export { generateSegmentation };
