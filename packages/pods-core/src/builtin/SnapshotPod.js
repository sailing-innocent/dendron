"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnapshotImportPod = exports.SnapshotExportPod = void 0;
const common_all_1 = require("@dendronhq/common-all");
const fs_extra_1 = __importDefault(require("fs-extra"));
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
const basev3_1 = require("../basev3");
const utils_1 = require("../utils");
const ID = "dendron.snapshot";
function genVaultId(vaultPath) {
    return path_1.default.basename(vaultPath);
}
class SnapshotExportPod extends basev3_1.ExportPod {
    get config() {
        return utils_1.PodUtils.createExportConfig({
            required: [],
            properties: {},
        });
    }
    async backupVault({ vault, snapshotDirPath, ignore, }) {
        const vaultId = genVaultId(vault.fsPath);
        return fs_extra_1.default.copy(vault.fsPath, path_1.default.join(snapshotDirPath, vaultId), {
            filter: (src) => {
                if (lodash_1.default.isEmpty(ignore)) {
                    return true;
                }
                src = path_1.default.relative(vault.fsPath, src);
                return !lodash_1.default.some(ignore, (ent) => {
                    return common_all_1.DUtils.minimatch(src, ent);
                });
            },
        });
    }
    async plant(opts) {
        const { vaults, dest } = opts;
        const { ignore } = lodash_1.default.defaults(opts.config, { ignore: ".git" });
        let cIgnore = lodash_1.default.reject(ignore.split(","), (ent) => lodash_1.default.isEmpty(ent));
        // const payload = this.prepareForExport(opts);
        // verify snapshot root
        let snapshotRoot = dest.fsPath;
        if (process.platform === "win32" && snapshotRoot[1] === ":") {
            // We're on Windows and the path includes a drive letter; uppercase it.
            snapshotRoot = `${snapshotRoot[0].toUpperCase()}${snapshotRoot.slice(1)}`;
        }
        fs_extra_1.default.ensureDirSync(snapshotRoot);
        // create snapshot folder
        const snapshotDirId = common_all_1.Time.now().toMillis().toString();
        const snapshotDirPath = path_1.default.join(snapshotRoot, snapshotDirId);
        fs_extra_1.default.ensureDirSync(snapshotDirPath);
        await Promise.all(vaults.map((vault) => {
            return this.backupVault({
                vault,
                snapshotDirPath,
                ignore: cIgnore,
            });
        }));
        return { notes: [], data: snapshotDirPath };
    }
}
SnapshotExportPod.id = ID;
SnapshotExportPod.description = "export notes to snapshot";
exports.SnapshotExportPod = SnapshotExportPod;
class SnapshotUtils {
    static copy({ src, dst, ignore, }) {
        return fs_extra_1.default.copy(src, dst, {
            filter: (_src) => {
                if (lodash_1.default.isEmpty(ignore)) {
                    return true;
                }
                _src = lodash_1.default.trimStart(lodash_1.default.replace(_src, src, ""), "/");
                return !lodash_1.default.some(ignore, (ent) => {
                    return common_all_1.DUtils.minimatch(_src, ent);
                });
            },
        });
    }
    static snapshotDir2Vault({ vaults, wsRoot, }) {
        if (lodash_1.default.isEmpty(vaults)) {
            return { fsPath: path_1.default.join(wsRoot, "vault") };
        }
        // TODO: impl for multi-vault
        return vaults[0];
    }
}
class SnapshotImportPod extends basev3_1.ImportPod {
    get config() {
        return utils_1.PodUtils.createImportConfig({
            required: [],
            properties: {},
        });
    }
    async restoreVault({ wsRoot, vaults, snapshotDirPath, }) {
        const vault = SnapshotUtils.snapshotDir2Vault({
            snapshotDirPath,
            vaults,
            wsRoot,
        });
        return SnapshotUtils.copy({
            src: snapshotDirPath,
            dst: vault.fsPath,
            ignore: [".git"],
        });
    }
    async plant(opts) {
        const ctx = "SnapshotImportPod:plant";
        const { wsRoot, vaults, src } = opts;
        const vaultSnapshots = fs_extra_1.default.readdirSync(src.fsPath);
        this.L.info({ ctx, src: src.fsPath });
        await Promise.all(vaultSnapshots.map((ent) => {
            return this.restoreVault({
                wsRoot,
                vaults,
                snapshotDirPath: path_1.default.join(src.fsPath, ent),
            });
        }));
        return { importedNotes: [] };
    }
}
SnapshotImportPod.id = ID;
SnapshotImportPod.description = "import snapshot";
exports.SnapshotImportPod = SnapshotImportPod;
//# sourceMappingURL=SnapshotPod.js.map