/**
 * A connection to an external service
 */
export type ExternalTarget = {
    /**
     * A unique identifier for this connection
     */
    connectionId: string;
    /**
     * Type of external service this instance connects to
     */
    serviceType: ExternalService;
};
/**
 * Check if an object implements the {@link ExternalTarget} type
 * @param object
 * @returns
 */
export declare function isExternalTarget(object: any): object is ExternalTarget;
/**
 * Types of currently supported external services
 */
export declare enum ExternalService {
    Airtable = "Airtable",
    GoogleDocs = "GoogleDocs",
    Notion = "Notion"
}
/**
 * Manages connection configurations to external services
 */
export declare class ExternalConnectionManager {
    static subPath: string;
    configRootPath: string;
    constructor(configRootPath: string);
    /**
     * Create a new configuration file for a service connection
     * @param serviceType
     * @param id a unique ID to identify this connection
     * @returns full path to the newly created config file
     */
    createNewConfig({ serviceType, id, }: {
        serviceType: ExternalService;
        id: string;
    }): Promise<string>;
    /**
     * Get a config by its ID, if it exists. The config file must have a valid
     * connectionId property.
     * @template T - Type of the Config being retrieved
     * @param param0 connection ID of the config to retrieve
     * @returns the config if it exists, otherwise undefined
     */
    getConfigById<T extends ExternalTarget>({ id, }: {
        id: string;
    }): T | undefined;
    /**
     * Get all valid configurations. Invalid configurations will not be returned
     * @returns
     */
    getAllValidConfigs(): Promise<ExternalTarget[]>;
    /**
     * Get all configs for a particular type of external service
     * @param type
     * @returns
     */
    getAllConfigsByType(type: ExternalService): Promise<ExternalTarget[]>;
    private getConfigFiles;
}
