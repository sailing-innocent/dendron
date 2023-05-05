"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VaultUtils = void 0;
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
const _1 = require(".");
const constants_1 = require("./constants");
const error_1 = require("./error");
class VaultUtils {
    static getName(vault) {
        if (vault.seed) {
            return vault.seed;
        }
        return vault.name || path_1.default.basename(vault.fsPath);
    }
    static isEqual(vaultSrc, vaultCmp, wsRoot) {
        if (lodash_1.default.isString(vaultSrc)) {
            vaultSrc = { fsPath: vaultSrc };
        }
        if (lodash_1.default.isString(vaultCmp)) {
            vaultCmp = { fsPath: vaultCmp };
        }
        return (this.normVaultPath({ vault: vaultSrc, wsRoot }) ===
            this.normVaultPath({ vault: vaultCmp, wsRoot }));
    }
    static isEqualV2(vaultSrc, vaultCmp) {
        return VaultUtils.getRelPath(vaultSrc) === VaultUtils.getRelPath(vaultCmp);
    }
    static isSelfContained(vault) {
        return vault.selfContained === true;
    }
    static isSeed(vault) {
        return vault.seed !== undefined;
    }
    static isRemote(vault) {
        return vault.remote !== undefined;
    }
    /**
     * Path for the location of notes in this vault, relative to the workspace
     * root.
     *
     * While for old vaults this is the same as
     * {@link VaultUtils.getRelVaultRootPath}, for self contained vaults the notes
     * are located inside the vault in the `notes` subdirectory.
     *
     * @param vault
     * @returns path for location of the notes in the vault, relative to the
     * workspace root
     */
    static getRelPath(vault) {
        if (VaultUtils.isSelfContained(vault)) {
            // Return the path to the notes folder inside the vault. This is for
            // compatibility with existing code.
            return (0, _1.normalizeUnixPath)(path_1.default.join(vault.fsPath, _1.FOLDERS.NOTES));
        }
        if (vault.workspace) {
            return path_1.default.join(vault.workspace, vault.fsPath);
        }
        if (vault.seed) {
            return path_1.default.join("seeds", vault.seed, vault.fsPath);
        }
        return vault.fsPath;
    }
    /**
     * Path for the location of vault root, relative to the workspace root.
     *
     * While for old vaults this is the same as {@link VaultUtils.getRelPath}, for
     * self contained vaults the notes are located inside the vault in the `notes`
     * subdirectory.
     *
     * @param vault
     * @returns path for root of the vault, relative to the workspace root. May be "." for the top level self contained vault.
     */
    static getRelVaultRootPath(vault) {
        if (VaultUtils.isSelfContained(vault))
            return vault.fsPath;
        return VaultUtils.getRelPath(vault);
    }
    static getVaultByName({ vaults, vname, }) {
        const vault = lodash_1.default.find(vaults, (vault) => {
            return vname === VaultUtils.getName(vault);
        });
        return vault;
    }
    /**
     * Like {@link getVaultByName} except throw error if undefined
     * @param param0
     * @returns
     */
    static getVaultByNameOrThrow({ vaults, vname, }) {
        const vault = this.getVaultByName({ vaults, vname });
        if (!vault) {
            throw new error_1.DendronError({ message: `vault with name ${vname} not found` });
        }
        return vault;
    }
    /**
     * See if a dir path matches that of an existing vault
     * @param param0
     * @returns
     */
    static getVaultByDirPath({ vaults, wsRoot, fsPath, }) {
        const normPath = this.normPathByWsRoot({
            wsRoot,
            fsPath,
        }).trim();
        const unixPath = (0, _1.normalizeUnixPath)(normPath);
        const vault = lodash_1.default.find(vaults, (ent) => {
            return unixPath === (0, _1.normalizeUnixPath)(VaultUtils.getRelPath(ent).trim());
        });
        if (!vault) {
            throw new error_1.DendronError({
                message: "no vault found",
                payload: { wsRoot, fsPath, vaults, normPath, msg: "no vault found" },
            });
        }
        return vault;
    }
    static getVaultByFilePath({ vaults, wsRoot, fsPath, }) {
        return this.getVaultByDirPath({
            vaults,
            wsRoot,
            fsPath: path_1.default.dirname(fsPath),
        });
    }
    static toURIPrefix(vault) {
        return constants_1.CONSTANTS.DENDRON_DELIMETER + VaultUtils.getName(vault);
    }
    static toWorkspaceFolder(vault) {
        const name = VaultUtils.getName(vault);
        const vaultPath = VaultUtils.getRelPath(vault);
        return {
            path: (0, _1.normalizeUnixPath)(vaultPath),
            name: name === vaultPath || path_1.default.basename(vaultPath) === name
                ? undefined
                : name,
        };
    }
    /** Creates a dummy vault for files that are not in Dendron workspace, for example a markdown file that's not in any vault. Do not use for notes. */
    static createForFile({ filePath, wsRoot, }) {
        const normalizedPath = (0, _1.normalizeUnixPath)(path_1.default.dirname(path_1.default.relative(wsRoot, filePath)));
        return {
            fsPath: normalizedPath,
            name: `${this.FILE_VAULT_PREFIX}${_1.normalizeUnixPath}`,
        };
    }
    /** Returns true if the vault was created with {@link VaultUtils.createForFile} */
    static isFileVault(vault) {
        var _a;
        return ((_a = vault.name) === null || _a === void 0 ? void 0 : _a.startsWith(this.FILE_VAULT_PREFIX)) || false;
    }
}
/**
 * Match vault to vaults
 */
VaultUtils.matchVault = (opts) => {
    const { vault, vaults, wsRoot } = opts;
    const maybeMatch = lodash_1.default.filter(vaults, (v) => {
        return VaultUtils.isEqual(v, vault, wsRoot);
    });
    if (maybeMatch.length === 1) {
        return maybeMatch[0];
    }
    else {
        return false;
    }
};
/**
 * Match vault without using wsRoot
 * @param opts
 * @returns
 */
VaultUtils.matchVaultV2 = (opts) => {
    const { vault, vaults } = opts;
    const maybeMatch = lodash_1.default.filter(vaults, (v) => {
        return VaultUtils.isEqualV2(v, vault);
    });
    if (maybeMatch.length === 1) {
        return maybeMatch[0];
    }
    else {
        return false;
    }
};
/**
 * Vault path relative to root
 */
VaultUtils.normVaultPath = (opts) => {
    return path_1.default.isAbsolute(opts.vault.fsPath)
        ? path_1.default.relative(opts.wsRoot, VaultUtils.getRelPath(opts.vault))
        : VaultUtils.getRelPath(opts.vault);
};
/**
 * Get relative path to vault
 * @param opts
 * @returns
 */
VaultUtils.normPathByWsRoot = (opts) => {
    return path_1.default.relative(opts.wsRoot, opts.fsPath);
};
VaultUtils.FILE_VAULT_PREFIX = "dir-";
exports.VaultUtils = VaultUtils;
//# sourceMappingURL=vault.js.map