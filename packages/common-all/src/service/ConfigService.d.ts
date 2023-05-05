import { URI } from "vscode-uri";
import { ConfigReadOpts, IFileStore } from "../store";
import { DendronConfig, DendronConfigValue } from "../types";
import { DeepPartial } from "../utils";
import { DendronError } from "../error";
export type ConfigServiceOpts = {
    wsRoot: URI;
    homeDir: URI | undefined;
    fileStore: IFileStore;
};
export declare class ConfigService {
    static _singleton: undefined | ConfigService;
    wsRoot: URI;
    homeDir: URI | undefined;
    private _configStore;
    private _fileStore;
    get configPath(): URI;
    /** static */
    static instance(opts?: ConfigServiceOpts): ConfigService;
    static isConfigServiceOpts(opts?: ConfigServiceOpts): opts is ConfigServiceOpts;
    constructor(opts: ConfigServiceOpts);
    /** public */
    /**
     * Given defaults to use, apply defaults and create `dendron.yml`
     * @param defaults partial DendronConfig that holds desired default values
     * @returns created config
     */
    createConfig(defaults?: DeepPartial<DendronConfig>): import("neverthrow").ResultAsync<DendronConfig, DendronError<import("http-status-codes").StatusCodes | undefined> | DendronError<import("http-status-codes").StatusCodes | undefined>>;
    /**
     * read config from dendron.yml without any modifications
     * @returns Partial<DendronConfig>
     */
    readRaw(): import("neverthrow").ResultAsync<DeepPartial<DendronConfig>, DendronError<import("http-status-codes").StatusCodes | undefined> | DendronError<import("http-status-codes").StatusCodes | undefined>>;
    /**
     * read config from dendron.yml
     * @param opts applyOverride?
     * @returns DendronConfig
     */
    readConfig(opts?: ConfigReadOpts): import("neverthrow").ResultAsync<DendronConfig, DendronError<import("http-status-codes").StatusCodes | undefined> | DendronError<import("http-status-codes").StatusCodes | undefined>>;
    /**
     * Given a payload, clean up override content if exists, and write to dendron.yml
     * @param payload DendronConfig
     * @returns cleaned DendronConfig that was written
     */
    writeConfig(payload: DendronConfig): import("neverthrow").ResultAsync<DendronConfig, DendronError<import("http-status-codes").StatusCodes | undefined> | DendronError<import("http-status-codes").StatusCodes | undefined>>;
    /**
     * Given a key, get the value of key
     * @param key key of DendronConfig
     * @param opts applyOverride?
     * @returns value of key
     */
    getConfig(key: string, opts?: ConfigReadOpts): import("neverthrow").ResultAsync<any, DendronError<import("http-status-codes").StatusCodes | undefined> | DendronError<import("http-status-codes").StatusCodes | undefined>>;
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
    updateConfig(key: string, value: DendronConfigValue): import("neverthrow").ResultAsync<any, DendronError<import("http-status-codes").StatusCodes | undefined> | DendronError<import("http-status-codes").StatusCodes | undefined>>;
    /**
     * Given a key, unset the key from config object
     * key is an object path (e.g. `commands.lookup.note.leaveTrace`)
     * @param key key of DendronConfig
     * @returns value of key before deletion
     */
    deleteConfig(key: string): import("neverthrow").ResultAsync<any, DendronError<import("http-status-codes").StatusCodes | undefined> | DendronError<import("http-status-codes").StatusCodes | undefined>>;
    /** helpers */
    /**
     * Read raw config and apply defaults.
     * If raw config is v4, convert to v5 config before applying defaults
     * @returns DendronConfig
     */
    private readWithDefaults;
    /**
     * Read raw config, apply defaults, and merge override content.
     * if override isn't found, identical to {@link ConfigService.readWithDefaults}
     * @returns DendronConfig
     */
    private readWithOverrides;
    /**
     * Given a write payload,
     * if override is found, filter out the configs present in override
     * otherwise, pass through
     * @param payload write payload
     * @returns cleaned payload
     */
    private cleanWritePayload;
    /**
     * Search for override config from both workspace or home directory.
     * workspace override config takes precedence.
     * @returns override config
     */
    private searchOverride;
    /**
     * Given a config and an override config,
     * return the difference (config - override)
     *
     * Note that this is currently only used to filter out `workspace.vaults`
     * @param payload original payload
     * @param override override payload
     * @returns
     */
    private excludeOverrideVaults;
}
