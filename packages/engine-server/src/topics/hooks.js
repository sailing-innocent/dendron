"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HookUtils = void 0;
const common_all_1 = require("@dendronhq/common-all");
const common_server_1 = require("@dendronhq/common-server");
const axios_1 = __importDefault(require("axios"));
const execa_1 = __importDefault(require("execa"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
class HookUtils {
    static addToConfig({ config, hookType, hookEntry, }) {
        const hooks = common_all_1.ConfigUtils.getHooks(config);
        const onCreate = lodash_1.default.get(hooks, hookType, []).concat([hookEntry]);
        const hooksToAdd = hooks || { onCreate: [] };
        hooksToAdd.onCreate = onCreate;
        common_all_1.ConfigUtils.setHooks(config, hooksToAdd);
        return config;
    }
    static getHookDir(wsRoot) {
        return path_1.default.join(wsRoot, common_all_1.CONSTANTS.DENDRON_HOOKS_BASE);
    }
    static getHookScriptPath({ wsRoot, basename, }) {
        return path_1.default.join(wsRoot, common_all_1.CONSTANTS.DENDRON_HOOKS_BASE, basename);
    }
    static removeFromConfig({ config, hookType, hookId, }) {
        const hooks = common_all_1.ConfigUtils.getHooks(config);
        let onCreate = lodash_1.default.get(hooks, hookType, []);
        onCreate = lodash_1.default.remove(onCreate, { id: hookId });
        const idx = lodash_1.default.findIndex(onCreate, { id: hookId });
        onCreate.splice(idx, 1);
        const hooksAfterRemove = hooks || { onCreate: [] };
        hooksAfterRemove.onCreate = onCreate;
        common_all_1.ConfigUtils.setHooks(config, hooksAfterRemove);
        return config;
    }
}
_a = HookUtils;
HookUtils.requireHook = async ({ note, fpath, wsRoot, }) => {
    const logger = (0, common_server_1.createLogger)();
    logger.info({ ctx: "requireHook", msg: "using webpack require" });
    const req = require(`./webpack-require-hack.js`);
    logger.info({ ctx: "requireHook", fpath, wsRoot });
    return await req(fpath)({
        wsRoot,
        note: { ...note },
        execa: execa_1.default,
        axios: axios_1.default,
        _: lodash_1.default,
        NoteUtils: common_all_1.NoteUtils,
    });
};
HookUtils.validateHook = ({ hook, wsRoot, }) => {
    const scriptPath = hook.id + "." + hook.type;
    const hookPath = HookUtils.getHookScriptPath({
        wsRoot,
        basename: scriptPath,
    });
    if (!fs_extra_1.default.existsSync(hookPath)) {
        return {
            error: new common_all_1.DendronError({
                severity: common_all_1.ERROR_SEVERITY.MINOR,
                message: `hook ${hook.id} has missing script. ${hookPath} doesn't exist`,
            }),
            valid: false,
        };
    }
    return { error: null, valid: true };
};
exports.HookUtils = HookUtils;
//# sourceMappingURL=hooks.js.map