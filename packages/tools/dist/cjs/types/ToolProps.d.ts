declare type SharedToolProp = {
    supportedInteractionTypes?: Array<string>;
    configuration?: Record<string, any>;
};
export declare type ToolProps = SharedToolProp;
export declare type PublicToolProps = SharedToolProp & {
    name?: string;
};
export {};
