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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigStore = void 0;
const neverthrow_1 = require("neverthrow");
const error_1 = require("../error");
const vscode_uri_1 = require("vscode-uri");
const constants_1 = require("../constants");
const utils_1 = require("../utils");
const YamlUtils = __importStar(require("../yaml"));
const ResultUtils_1 = require("../ResultUtils");
class ConfigStore {
    get configPath() {
        return vscode_uri_1.Utils.joinPath(this._wsRoot, constants_1.CONSTANTS.DENDRON_CONFIG_FILE);
    }
    constructor(fileStore, wsRoot, homeDir) {
        this._fileStore = fileStore;
        this._wsRoot = wsRoot;
        this._homeDir = homeDir;
    }
    createConfig(defaults) {
        const config = utils_1.ConfigUtils.genLatestConfig(defaults);
        return YamlUtils.toStr(config)
            .asyncAndThen((configDump) => this.writeToFS(this.configPath, configDump))
            .map(() => config);
    }
    readConfig() {
        return this.readFromFS(this.configPath)
            .andThen(YamlUtils.fromStr)
            .andThen(utils_1.ConfigUtils.parsePartial);
    }
    readOverride(mode) {
        const doRead = (path) => {
            const readPath = vscode_uri_1.Utils.joinPath(path, constants_1.CONSTANTS.DENDRON_LOCAL_CONFIG_FILE);
            return this.readFromFS(readPath);
        };
        if (mode === "workspace") {
            return doRead(this._wsRoot);
        }
        else if (this._homeDir) {
            return doRead(this._homeDir);
        }
        else {
            return (0, neverthrow_1.errAsync)(new error_1.DendronError({
                message: "global override not supported with current file store.",
            }));
        }
    }
    writeConfig(payload) {
        return YamlUtils.toStr(payload)
            .asyncAndThen((endPayload) => this.writeToFS(this.configPath, endPayload))
            .map(() => payload);
    }
    /** helpers */
    writeToFS(uri, content) {
        return ResultUtils_1.ResultUtils.PromiseRespV3ToResultAsync(this._fileStore.write(uri, content));
    }
    readFromFS(uri) {
        return ResultUtils_1.ResultUtils.PromiseRespV3ToResultAsync(this._fileStore.read(uri));
    }
}
exports.ConfigStore = ConfigStore;
//# sourceMappingURL=ConfigStore.js.map