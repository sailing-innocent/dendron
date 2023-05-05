"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportPod = exports.ImportPod = exports.PublishPod = exports.PROMPT = void 0;
const common_all_1 = require("@dendronhq/common-all");
const common_server_1 = require("@dendronhq/common-server");
const lodash_1 = __importDefault(require("lodash"));
const vscode_uri_1 = require("vscode-uri");
const utils_1 = require("./utils");
var PROMPT;
(function (PROMPT) {
    PROMPT["USERPROMPT"] = "userPrompt";
})(PROMPT = exports.PROMPT || (exports.PROMPT = {}));
class PublishPod {
    constructor() {
        this.L = (0, common_server_1.createLogger)("PublishPod");
    }
    async execute(opts) {
        const { config, engine } = opts;
        const { fname, vaultName } = config;
        utils_1.PodUtils.validate(config, this.config);
        this.L.info({ ctx: "execute:enter", fname, vaultName });
        const vault = common_all_1.VaultUtils.getVaultByNameOrThrow({
            vaults: engine.vaults,
            vname: vaultName,
        });
        const note = (await engine.findNotes({ fname, vault }))[0];
        if (!note) {
            throw Error("no note found");
        }
        return this.plant({ ...opts, note });
    }
}
PublishPod.kind = "publish";
exports.PublishPod = PublishPod;
class ImportPod {
    constructor() {
        this.L = (0, common_server_1.createLogger)("ImportPod");
    }
    async execute(opts) {
        const { config, engine } = opts;
        utils_1.PodUtils.validate(config, this.config);
        const { src, vaultName } = lodash_1.default.defaults(config, {
            concatenate: false,
        });
        // validate config
        const vault = common_all_1.VaultUtils.getVaultByNameOrThrow({
            vaults: engine.vaults,
            vname: vaultName,
        });
        const srcURL = vscode_uri_1.URI.file((0, common_server_1.resolvePath)(src, engine.wsRoot));
        return this.plant({ ...opts, src: srcURL, vault });
    }
}
ImportPod.kind = "import";
exports.ImportPod = ImportPod;
class ExportPod {
    constructor() {
        this.L = (0, common_server_1.createLogger)("ExportPod");
    }
    /**
     * Checks for some pre-sets
     * - if not `includeBody`, then fetch notes without body
     * - if not `includeStubs`, then ignore stub nodes
     */
    prepareNotesForExport({ config, notes, }) {
        var _a, _b;
        const { includeBody } = lodash_1.default.defaults(config, { includeBody: true });
        if (!config.includeStubs) {
            notes = lodash_1.default.reject(notes, { stub: true });
        }
        if (!includeBody) {
            notes = notes.map((ent) => ({ ...ent, body: "" }));
        }
        if ((_a = config.vaults) === null || _a === void 0 ? void 0 : _a.exclude) {
            notes = lodash_1.default.reject(notes, (ent) => { var _a, _b; return (_b = (_a = config.vaults) === null || _a === void 0 ? void 0 : _a.exclude) === null || _b === void 0 ? void 0 : _b.includes(common_all_1.VaultUtils.getName(ent.vault)); });
        }
        if ((_b = config.vaults) === null || _b === void 0 ? void 0 : _b.include) {
            notes = lodash_1.default.filter(notes, (ent) => { var _a, _b; return (_b = (_a = config.vaults) === null || _a === void 0 ? void 0 : _a.include) === null || _b === void 0 ? void 0 : _b.includes(common_all_1.VaultUtils.getName(ent.vault)); });
        }
        if (config.ignore) {
            notes = lodash_1.default.reject(notes, (ent) => {
                return lodash_1.default.some(config.ignore, (pat) => (0, common_all_1.minimatch)(ent.fname, pat));
            });
        }
        return notes;
    }
    async execute(opts) {
        const { config, engine } = opts;
        utils_1.PodUtils.validate(config, this.config);
        const { dest } = config;
        // validate config
        const destURL = vscode_uri_1.URI.file((0, common_server_1.resolvePath)(dest, engine.wsRoot));
        // parse notes into NoteProps
        const engineNotes = await engine.findNotes({ excludeStub: false });
        const notes = this.prepareNotesForExport({
            config,
            notes: engineNotes,
        });
        try {
            return await this.plant({ ...opts, dest: destURL, notes });
        }
        catch (err) {
            console.log("error", (0, common_all_1.stringifyError)(err));
            throw err;
        }
    }
}
ExportPod.kind = "export";
exports.ExportPod = ExportPod;
//# sourceMappingURL=basev3.js.map