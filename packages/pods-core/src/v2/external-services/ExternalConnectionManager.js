"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalConnectionManager = exports.ExternalService = exports.isExternalTarget = void 0;
const common_all_1 = require("@dendronhq/common-all");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const __1 = require("../..");
/**
 * Check if an object implements the {@link ExternalTarget} type
 * @param object
 * @returns
 */
function isExternalTarget(object) {
    return (object !== undefined && "connectionId" in object && "serviceType" in object);
}
exports.isExternalTarget = isExternalTarget;
/**
 * Types of currently supported external services
 */
var ExternalService;
(function (ExternalService) {
    ExternalService["Airtable"] = "Airtable";
    ExternalService["GoogleDocs"] = "GoogleDocs";
    ExternalService["Notion"] = "Notion";
})(ExternalService = exports.ExternalService || (exports.ExternalService = {}));
/**
 * Manages connection configurations to external services
 */
class ExternalConnectionManager {
    constructor(configRootPath) {
        this.configRootPath = path_1.default.join(configRootPath, ExternalConnectionManager.subPath);
    }
    /**
     * Create a new configuration file for a service connection
     * @param serviceType
     * @param id a unique ID to identify this connection
     * @returns full path to the newly created config file
     */
    async createNewConfig({ serviceType, id, }) {
        if (this.getConfigById({ id })) {
            throw new Error("This ID is already in use");
        }
        switch (serviceType) {
            case ExternalService.Airtable: {
                return __1.ConfigFileUtils.genConfigFileV2({
                    fPath: path_1.default.join(this.configRootPath, `svcconfig.${id}.yml`),
                    configSchema: __1.AirtableConnection.getSchema(),
                    setProperties: { connectionId: id },
                });
            }
            case ExternalService.GoogleDocs: {
                const file = __1.ConfigFileUtils.genConfigFileV2({
                    fPath: path_1.default.join(this.configRootPath, `svcconfig.${id}.yml`),
                    configSchema: __1.GoogleDocsConnection.getSchema(),
                    setProperties: { connectionId: id },
                });
                return file;
            }
            case ExternalService.Notion: {
                const file = __1.ConfigFileUtils.genConfigFileV2({
                    fPath: path_1.default.join(this.configRootPath, `svcconfig.${id}.yml`),
                    configSchema: __1.NotionConnection.getSchema(),
                    setProperties: { connectionId: id },
                });
                return file;
            }
            default:
                (0, common_all_1.assertUnreachable)(serviceType);
        }
    }
    /**
     * Get a config by its ID, if it exists. The config file must have a valid
     * connectionId property.
     * @template T - Type of the Config being retrieved
     * @param param0 connection ID of the config to retrieve
     * @returns the config if it exists, otherwise undefined
     */
    getConfigById({ id, }) {
        const files = this.getConfigFiles();
        for (const fileName of files) {
            const config = __1.ConfigFileUtils.getConfigByFPath({
                fPath: path_1.default.join(this.configRootPath, fileName),
            });
            if (config && config.connectionId && config.connectionId === id) {
                return config;
            }
        }
        return undefined;
    }
    /**
     * Get all valid configurations. Invalid configurations will not be returned
     * @returns
     */
    async getAllValidConfigs() {
        const files = this.getConfigFiles();
        const validConfigs = [];
        files.forEach((file) => {
            const config = __1.ConfigFileUtils.getConfigByFPath({
                fPath: path_1.default.join(this.configRootPath, file),
            });
            if (isExternalTarget(config)) {
                validConfigs.push(config);
            }
        });
        return validConfigs;
    }
    /**
     * Get all configs for a particular type of external service
     * @param type
     * @returns
     */
    async getAllConfigsByType(type) {
        const allValidConfigs = await this.getAllValidConfigs();
        return allValidConfigs.filter((config) => config.serviceType === type);
    }
    getConfigFiles() {
        if (fs_extra_1.default.existsSync(this.configRootPath)) {
            return fs_extra_1.default
                .readdirSync(this.configRootPath)
                .filter((file) => file.endsWith(".yml"));
        }
        return [];
    }
}
ExternalConnectionManager.subPath = "service-connections";
exports.ExternalConnectionManager = ExternalConnectionManager;
//# sourceMappingURL=ExternalConnectionManager.js.map