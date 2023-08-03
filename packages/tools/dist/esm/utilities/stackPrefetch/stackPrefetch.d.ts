declare function enable(element: any): void;
declare function disable(element: any): void;
declare function getConfiguration(): {
    maxImagesToPrefetch: number;
    preserveExistingPool: boolean;
};
declare function setConfiguration(config: any): void;
export { enable, disable, getConfiguration, setConfiguration };
