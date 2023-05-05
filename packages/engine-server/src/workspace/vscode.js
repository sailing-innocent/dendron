"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Settings = exports.Snippets = exports.Extensions = exports.WorkspaceConfig = exports._SETTINGS = void 0;
const common_all_1 = require("@dendronhq/common-all");
const common_server_1 = require("@dendronhq/common-server");
const fs_extra_1 = __importDefault(require("fs-extra"));
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
exports._SETTINGS = {
    "dendron.rootDir": {
        default: ".",
    },
    // "editor.minimap.enabled": {
    //   default: false,
    // },
    "files.autoSave": {
        default: "onFocusChange",
    },
    // --- images
    // eslint-disable-next-line no-template-curly-in-string
    "pasteImage.path": { default: "${currentFileDir}/assets/images" },
    // required for jekyll image build
    "pasteImage.prefix": { default: "/" },
    // -- md notes
    // prevent markdown-notes from mangling file names
    "markdown-preview-enhanced.enableWikiLinkSyntax": { default: true },
    "markdown-preview-enhanced.wikiLinkFileExtension": { default: ".md" },
    // --- snippets
    // add snippet completion
    "editor.snippetSuggestions": { default: "inline" },
    "editor.suggest.snippetsPreventQuickSuggestions": { default: false },
    "editor.suggest.showSnippets": { default: true },
    "editor.tabCompletion": { default: "on" },
};
const _EXTENSIONS = [
    { default: "dendron.dendron" },
    { default: "dendron.dendron-paste-image" },
    { default: "dendron.dendron-markdown-shortcuts" },
    // Autocomplete & warnings when editing `dendron.yml`
    { default: "redhat.vscode-yaml" },
    { default: "dendron.dendron-markdown-links", action: "REMOVE" },
    { default: "dendron.dendron-markdown-notes", action: "REMOVE" },
    { default: "dendron.dendron-markdown-preview-enhanced", action: "REMOVE" },
    { default: "shd101wyy.markdown-preview-enhanced", action: "REMOVE" },
    { default: "kortina.vscode-markdown-notes", action: "REMOVE" },
    { default: "mushan.vscode-paste-image", action: "REMOVE" },
];
class WorkspaceConfig {
    static genDefaults() {
        return {
            folders: [],
            settings: Settings.defaults(),
            extensions: Extensions.defaults(),
        };
    }
    static workspaceFile(wsRoot) {
        return path_1.default.join(wsRoot, common_all_1.CONSTANTS.DENDRON_WS_NAME);
    }
    /**
     * Create dendron.code-workspace file
     * @param wsRoot
     * @param vaults
     * @param opts
     * @returns
     */
    static write(wsRoot, vaults, opts) {
        const cleanOpts = lodash_1.default.defaults(opts, {
            vaults,
            overrides: {},
        });
        const defaultSettings = this.genDefaults();
        const jsonBody = lodash_1.default.merge(defaultSettings, {
            folders: cleanOpts.vaults
                ? cleanOpts.vaults.map((ent) => ({
                    path: ent.fsPath,
                    name: ent.name,
                }))
                : [],
        }, cleanOpts.overrides);
        return fs_extra_1.default.writeJSONSync(WorkspaceConfig.workspaceFile(wsRoot), jsonBody, {
            spaces: 2,
        });
    }
}
exports.WorkspaceConfig = WorkspaceConfig;
class Extensions {
    static defaults() {
        const recommendations = Extensions.configEntries()
            .filter((ent) => {
            return lodash_1.default.isUndefined(ent.action) || (ent === null || ent === void 0 ? void 0 : ent.action) !== "REMOVE";
        })
            .map((ent) => ent.default);
        const unwantedRecommendations = Extensions.configEntries()
            .filter((ent) => {
            return (ent === null || ent === void 0 ? void 0 : ent.action) === "REMOVE";
        })
            .map((ent) => ent.default);
        return {
            recommendations,
            unwantedRecommendations,
        };
    }
    static configEntries() {
        return _EXTENSIONS;
    }
    static update(extensions) {
        const recommendations = new Set(extensions.recommendations);
        const unwantedRecommendations = new Set(extensions.unwantedRecommendations);
        const configEntries = Extensions.configEntries();
        configEntries.forEach((ent) => {
            if ((ent === null || ent === void 0 ? void 0 : ent.action) === "REMOVE") {
                recommendations.delete(ent.default);
                unwantedRecommendations.add(ent.default);
            }
            else {
                recommendations.add(ent.default);
                unwantedRecommendations.delete(ent.default);
            }
        });
        return {
            recommendations: Array.from(recommendations),
            unwantedRecommendations: Array.from(unwantedRecommendations),
        };
    }
}
Extensions.EXTENSION_FILE_NAME = "extensions.json";
exports.Extensions = Extensions;
class Snippets {
    static async upgradeOrCreate(dirPath) {
        const out = await Snippets.read(dirPath);
        if (!out) {
            Snippets.create(dirPath);
            return Snippets.defaults;
        }
        else {
            const changed = {};
            const prefixKey = lodash_1.default.mapKeys(out, (ent) => ent.prefix);
            lodash_1.default.each(Snippets.defaults, (v, k) => {
                if (!lodash_1.default.has(out, k) && !lodash_1.default.has(prefixKey, v.prefix)) {
                    changed[k] = v;
                }
            });
            await Snippets.write(dirPath, out, changed);
            return changed;
        }
    }
    static write(dirPath, orig, changed) {
        const snippetPath = path_1.default.join(dirPath, Snippets.filename);
        const snippets = (0, common_server_1.assignJSONWithComment)(orig, changed);
        return (0, common_server_1.writeJSONWithCommentsSync)(snippetPath, snippets);
    }
}
_a = Snippets;
Snippets.filename = "dendron.code-snippets";
Snippets.defaults = {
    todo: {
        prefix: "to",
        scope: "markdown,yaml",
        body: "- [ ] ",
        description: "render todo box",
    },
    date: {
        prefix: "date",
        scope: "markdown,yaml",
        body: "$CURRENT_YEAR.$CURRENT_MONTH.$CURRENT_DATE",
        description: "today's date",
    },
    time: {
        prefix: "time",
        scope: "markdown,yaml",
        body: "$CURRENT_YEAR-$CURRENT_MONTH-$CURRENT_DATE $CURRENT_HOUR:$CURRENT_MINUTE",
        description: "time",
    },
};
Snippets.create = (dirPath) => {
    fs_extra_1.default.ensureDirSync(dirPath);
    const snippetPath = path_1.default.join(dirPath, Snippets.filename);
    return fs_extra_1.default.writeJSONSync(snippetPath, Snippets.defaults, { spaces: 4 });
};
Snippets.read = async (dirPath) => {
    const snippetPath = path_1.default.join(dirPath, Snippets.filename);
    if (!fs_extra_1.default.existsSync(snippetPath)) {
        return false;
    }
    else {
        return (0, common_server_1.readJSONWithComments)(snippetPath);
    }
};
exports.Snippets = Snippets;
class Settings {
    static getDefaults() {
        return lodash_1.default.mapValues(exports._SETTINGS, (obj) => {
            return obj.default;
        });
    }
    static configEntries() {
        return exports._SETTINGS;
    }
    static defaults() {
        return { ...Settings.getDefaults() };
    }
    static defaultsChangeSet() {
        return exports._SETTINGS;
    }
}
exports.Settings = Settings;
//# sourceMappingURL=vscode.js.map