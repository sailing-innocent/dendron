"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFuseEngine = void 0;
const common_all_1 = require("@dendronhq/common-all");
const getWorkspaceConfig_1 = require("./getWorkspaceConfig");
/**
 * Instantiate fuseEngine using values from config
 *
 * @param wsRoot
 * @returns fuseEngine
 */
async function getFuseEngine(wsRoot) {
    const config = await (0, getWorkspaceConfig_1.getWorkspaceConfig)(wsRoot);
    return new common_all_1.FuseEngine({
        fuzzThreshold: common_all_1.ConfigUtils.getLookup(config).note.fuzzThreshold,
    });
}
exports.getFuseEngine = getFuseEngine;
//# sourceMappingURL=getFuseEngine.js.map