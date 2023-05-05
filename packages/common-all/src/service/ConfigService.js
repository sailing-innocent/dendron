"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigService = void 0;
const lodash_1 = __importDefault(require("lodash"));
const store_1 = require("../store");
const neverthrow_1 = require("neverthrow");
const utils_1 = require("../utils");
const error_1 = require("../error");
const YamlUtils = __importStar(require("../yaml"));
const ConfigCompat_1 = require("../oneoff/ConfigCompat");
class ConfigService {
    get configPath() {
        return this._configStore.configPath;
    }
    /** static */
    static instance(opts) {
        if (lodash_1.default.isUndefined(this._singleton)) {
            if (ConfigService.isConfigServiceOpts(opts)) {
                this._singleton = new ConfigService(opts);
            }
            else {
                throw new error_1.DendronError({
                    message: "Unable to retrieve or create config service instance.",
                });
            }
        }
        return this._singleton;
    }
    static isConfigServiceOpts(opts) {
        if (opts === undefined)
            return false;
        if (opts.wsRoot === undefined || opts.fileStore === undefined)
            return false;
        return true;
    }
    constructor(opts) {
        this.wsRoot = opts.wsRoot;
        this.homeDir = opts.homeDir;
        this._fileStore = opts.fileStore;
        this._configStore = new store_1.ConfigStore(this._fileStore, this.wsRoot, this.homeDir);
    }
    /** public */
    /**
     * Given defaults to use, apply defaults and create `dendron.yml`
     * @param defaults partial DendronConfig that holds desired default values
     * @returns created config
     */
    createConfig(defaults) {
        return this._configStore.createConfig(defaults);
    }
    /**
     * read config from dendron.yml without any modifications
     * @returns Partial<DendronConfig>
     */
    readRaw() {
        return this._configStore.readConfig();
    }
    /**
     * read config from dendron.yml
     * @param opts applyOverride?
     * @returns DendronConfig
     */
    readConfig(opts) {
        const { applyOverride } = lodash_1.default.defaults(opts, { applyOverride: true });
        if (!applyOverride) {
            return this.readWithDefaults();
        }
        else {
            return this.readWithOverrides();
        }
    }
    /**
     * Given a payload, clean up override content if exists, and write to dendron.yml
     * @param payload DendronConfig
     * @returns cleaned DendronConfig that was written
     */
    writeConfig(payload) {
        return this.cleanWritePayload(payload).andThen((payload) => {
            return this._configStore.writeConfig(payload);
        });
    }
    /**
     * Given a key, get the value of key
     * @param key key of DendronConfig
     * @param opts applyOverride?
     * @returns value of key
     */
    getConfig(key, opts) {
        return this.readConfig(opts).map((config) => lodash_1.default.get(config, key));
    }
    /**
     * Given an key and value, update the value of key with given value
     * key is an object path (e.g. `commands.lookup.note.leaveTrace`)
     *
     * note: this currently does not do validation for the resulting config object.
     *
     * @param key key of DendronConfig
     * @param value value to use for update of key
     * @returns value of key before update
     */
    updateConfig(key, value) {
        return this.readConfig().andThen((config) => {
            const prevValue = lodash_1.default.get(config, key);
            const updatedConfig = lodash_1.default.set(config, key, value);
            return this.writeConfig(updatedConfig).map(() => prevValue);
        });
    }
    /**
     * Given a key, unset the key from config object
     * key is an object path (e.g. `commands.lookup.note.leaveTrace`)
     * @param key key of DendronConfig
     * @returns value of key before deletion
     */
    deleteConfig(key) {
        return this.readConfig().andThen((config) => {
            const prevValue = lodash_1.default.get(config, key);
            if (prevValue === undefined) {
                return (0, neverthrow_1.errAsync)(new error_1.DendronError({ message: `${key} does not exist` }));
            }
            lodash_1.default.unset(config, key);
            return this.writeConfig(config).map(() => prevValue);
        });
    }
    /** helpers */
    /**
     * Read raw config and apply defaults.
     * If raw config is v4, convert to v5 config before applying defaults
     * @returns DendronConfig
     */
    readWithDefaults() {
        return this.readRaw().andThen((rawConfig) => {
            const cleanConfig = ConfigCompat_1.DConfigLegacy.configIsV4(rawConfig)
                ? ConfigCompat_1.DConfigLegacy.v4ToV5(rawConfig)
                : lodash_1.default.defaultsDeep(rawConfig, utils_1.ConfigUtils.genDefaultConfig());
            return utils_1.ConfigUtils.parse(cleanConfig);
        });
    }
    /**
     * Read raw config, apply defaults, and merge override content.
     * if override isn't found, identical to {@link ConfigService.readWithDefaults}
     * @returns DendronConfig
     */
    readWithOverrides() {
        return this.searchOverride()
            .orElse(() => this.readWithDefaults())
            .andThen(utils_1.ConfigUtils.validateLocalConfig)
            .andThen((override) => this.readWithDefaults().map((config) => utils_1.ConfigUtils.mergeConfig(config, override)));
    }
    /**
     * Given a write payload,
     * if override is found, filter out the configs present in override
     * otherwise, pass through
     * @param payload write payload
     * @returns cleaned payload
     */
    cleanWritePayload(payload) {
        return this.searchOverride()
            .andThen((overrideConfig) => {
            return this.excludeOverrideVaults(payload, overrideConfig);
        })
            .orElse(() => (0, neverthrow_1.okAsync)(payload));
    }
    /**
     * Search for override config from both workspace or home directory.
     * workspace override config takes precedence.
     * @returns override config
     */
    searchOverride() {
        return this._configStore
            .readOverride("workspace")
            .orElse(() => {
            return this._configStore
                .readOverride("global")
                .orElse(() => (0, neverthrow_1.okAsync)(""));
        })
            .andThen(YamlUtils.fromStr)
            .andThen(utils_1.ConfigUtils.parsePartial);
    }
    /**
     * Given a config and an override config,
     * return the difference (config - override)
     *
     * Note that this is currently only used to filter out `workspace.vaults`
     * @param payload original payload
     * @param override override payload
     * @returns
     */
    excludeOverrideVaults(payload, override) {
        var _a;
        const vaultsFromOverride = (_a = override.workspace) === null || _a === void 0 ? void 0 : _a.vaults;
        const payloadDifference = {
            ...payload,
            workspace: {
                ...payload.workspace,
                vaults: lodash_1.default.differenceWith(payload.workspace.vaults, vaultsFromOverride, lodash_1.default.isEqual),
            },
        };
        return (0, neverthrow_1.okAsync)(payloadDifference);
    }
}
exports.ConfigService = ConfigService;
//# sourceMappingURL=ConfigService.js.map