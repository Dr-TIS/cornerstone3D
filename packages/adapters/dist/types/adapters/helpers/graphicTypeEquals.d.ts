/**
 * Checks if a given content item's GraphicType property matches a specified value.
 * @param {string} graphicType - The value to compare the content item's GraphicType property to.
 * @returns {function} A function that takes a content item and returns a boolean indicating whether its GraphicType property matches the specified value.
 */
declare const graphicTypeEquals: (graphicType: any) => (contentItem: any) => boolean;
export { graphicTypeEquals };
