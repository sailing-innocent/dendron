"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAssetsPrefix = void 0;
const common_all_1 = require("@dendronhq/common-all");
const getWorkspaceConfig_1 = require("./getWorkspaceConfig");
/**
 * Get the assetsPrefix from publishing config
 * @param wsRoot
 * @returns assetsPrefix
 */
async function getAssetsPrefix(wsRoot) {
    const config = await (0, getWorkspaceConfig_1.getWorkspaceConfig)(wsRoot);
    return common_all_1.ConfigUtils.getAssetsPrefix(config) || "";
}
exports.getAssetsPrefix = getAssetsPrefix;
//# sourceMappingURL=getAssetsPrefix.js.map