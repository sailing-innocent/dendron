import { DendronError } from "../error";
import { URI } from "vscode-uri";
import { IConfigStore } from "./IConfigStore";
import { IFileStore } from "./IFileStore";
import { DeepPartial } from "../utils";
import { DendronConfig } from "../types";
export declare class ConfigStore implements IConfigStore {
    private _fileStore;
    private _wsRoot;
    private _homeDir;
    get configPath(): URI;
    constructor(fileStore: IFileStore, wsRoot: URI, homeDir: URI | undefined);
    createConfig(defaults?: DeepPartial<DendronConfig>): import("neverthrow").ResultAsync<DendronConfig, DendronError<import("http-status-codes/build/cjs/status-codes").StatusCodes | undefined> | DendronError<import("http-status-codes/build/cjs/status-codes").StatusCodes | undefined>>;
    readConfig(): import("neverthrow").ResultAsync<DeepPartial<DendronConfig>, DendronError<import("http-status-codes/build/cjs/status-codes").StatusCodes | undefined> | DendronError<import("http-status-codes/build/cjs/status-codes").StatusCodes | undefined>>;
    readOverride(mode: "workspace" | "global"): import("neverthrow").ResultAsync<string, DendronError<import("http-status-codes/build/cjs/status-codes").StatusCodes | undefined>>;
    writeConfig(payload: DendronConfig): import("neverthrow").ResultAsync<DendronConfig, DendronError<import("http-status-codes/build/cjs/status-codes").StatusCodes | undefined> | DendronError<import("http-status-codes/build/cjs/status-codes").StatusCodes | undefined>>;
    /** helpers */
    private writeToFS;
    private readFromFS;
}
