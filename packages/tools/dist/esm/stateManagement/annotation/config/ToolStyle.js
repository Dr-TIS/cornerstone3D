class ToolStyle {
    constructor() {
        const defaultConfig = {
            color: 'rgb(255, 255, 0)',
            colorHighlighted: 'rgb(0, 255, 0)',
            colorSelected: 'rgb(0, 220, 0)',
            colorLocked: 'rgb(255, 255, 0)',
            lineWidth: '1',
            lineDash: '',
            shadow: true,
            textBoxFontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
            textBoxFontSize: '14px',
            textBoxColor: 'rgb(255, 255, 0)',
            textBoxColorHighlighted: 'rgb(0, 255, 0)',
            textBoxColorSelected: 'rgb(0, 255, 0)',
            textBoxColorLocked: 'rgb(255, 255, 0)',
            textBoxBackground: '',
            textBoxLinkLineWidth: '1',
            textBoxLinkLineDash: '2,3',
            textBoxShadow: true,
        };
        this._initializeConfig(defaultConfig);
    }
    getAnnotationToolStyles(annotationUID) {
        return this.config.annotations && this.config.annotations[annotationUID];
    }
    getViewportToolStyles(viewportId) {
        return this.config.viewports && this.config.viewports[viewportId];
    }
    getToolGroupToolStyles(toolGroupId) {
        return this.config.toolGroups && this.config.toolGroups[toolGroupId];
    }
    getDefaultToolStyles() {
        return this.config.default;
    }
    setAnnotationStyles(annotationUID, styles) {
        let annotationSpecificStyles = this.config.annotations;
        if (!annotationSpecificStyles) {
            this.config = {
                ...this.config,
                annotations: {},
            };
            annotationSpecificStyles = this.config.annotations;
        }
        annotationSpecificStyles[annotationUID] = styles;
    }
    setViewportToolStyles(viewportId, styles) {
        let viewportSpecificStyles = this.config.viewports;
        if (!viewportSpecificStyles) {
            this.config = {
                ...this.config,
                viewports: {},
            };
            viewportSpecificStyles = this.config.viewports;
        }
        viewportSpecificStyles[viewportId] = styles;
    }
    setToolGroupToolStyles(toolGroupId, styles) {
        let toolGroupSpecificStyles = this.config.toolGroups;
        if (!toolGroupSpecificStyles) {
            this.config = {
                ...this.config,
                toolGroups: {},
            };
            toolGroupSpecificStyles = this.config.toolGroups;
        }
        toolGroupSpecificStyles[toolGroupId] = styles;
    }
    setDefaultToolStyles(styles) {
        this.config.default = styles;
    }
    getStyleProperty(toolStyle, specifications) {
        const { annotationUID, viewportId, toolGroupId, toolName } = specifications;
        return this._getToolStyle(toolStyle, annotationUID, viewportId, toolGroupId, toolName);
    }
    _getToolStyle(property, annotationUID, viewportId, toolGroupId, toolName) {
        if (annotationUID) {
            const styles = this.getAnnotationToolStyles(annotationUID);
            if (styles) {
                if (styles[property]) {
                    return styles[property];
                }
            }
        }
        if (viewportId) {
            const styles = this.getViewportToolStyles(viewportId);
            if (styles) {
                if (styles[toolName] && styles[toolName][property]) {
                    return styles[toolName][property];
                }
                if (styles.global && styles.global[property]) {
                    return styles.global[property];
                }
            }
        }
        if (toolGroupId) {
            const styles = this.getToolGroupToolStyles(toolGroupId);
            if (styles) {
                if (styles[toolName] && styles[toolName][property]) {
                    return styles[toolName][property];
                }
                if (styles.global && styles.global[property]) {
                    return styles.global[property];
                }
            }
        }
        const globalStyles = this.getDefaultToolStyles();
        if (globalStyles[toolName] && globalStyles[toolName][property]) {
            return globalStyles[toolName][property];
        }
        if (globalStyles.global && globalStyles.global[property]) {
            return globalStyles.global[property];
        }
    }
    _initializeConfig(config) {
        const toolStyles = {};
        for (const name in config) {
            toolStyles[name] = config[name];
        }
        this.config = {
            default: {
                global: toolStyles,
            },
        };
    }
}
const toolStyle = new ToolStyle();
export default toolStyle;
//# sourceMappingURL=ToolStyle.js.map