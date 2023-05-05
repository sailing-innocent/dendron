"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeedService = exports.SeedInitMode = void 0;
const common_all_1 = require("@dendronhq/common-all");
const common_server_1 = require("@dendronhq/common-server");
const fs_extra_1 = __importDefault(require("fs-extra"));
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
const workspace_1 = require("../workspace");
const registry_1 = require("./registry");
const utils_1 = require("./utils");
var SeedInitMode;
(function (SeedInitMode) {
    SeedInitMode["CREATE_WORKSPACE"] = "create_workspace";
    SeedInitMode["CONVERT_WORKSPACE"] = "convert_workspace";
})(SeedInitMode = exports.SeedInitMode || (exports.SeedInitMode = {}));
class SeedService {
    /**
     *
     * @param wsRoot - root of file
     * @param registryFile - custom yml file to look for registry
     */
    constructor({ wsRoot, registryFile, registry, }) {
        this.wsRoot = wsRoot;
        this.registryFile = registryFile;
        this.registry = registry || registry_1.SeedRegistry.create({ registryFile });
    }
    async getSeedOrErrorFromId(id) {
        const maybeSeed = await this.registry.info({ id });
        if (!maybeSeed) {
            return common_all_1.DendronError.createFromStatus({
                status: common_all_1.ERROR_STATUS.DOES_NOT_EXIST,
                message: `seed ${id} does not exist`,
            });
        }
        return maybeSeed;
    }
    async addSeed({ id, metaOnly, onUpdatingWorkspace, onUpdatedWorkspace, }) {
        const seedOrError = await this.getSeedOrErrorFromId(id);
        if (seedOrError instanceof common_all_1.DendronError) {
            return {
                error: seedOrError,
            };
        }
        let seedPath;
        // Seed cloning must occur before the metadata changes - if the current
        // workspace that is open is the one being modified in addSeedMetadata(), VS
        // Code will reload the current window and the seed cloning may not execute.
        if (!metaOnly) {
            seedPath = await this.cloneSeed({ seed: seedOrError });
        }
        await this.addSeedMetadata({
            seed: seedOrError,
            wsRoot: this.wsRoot,
            onUpdatingWorkspace,
            onUpdatedWorkspace,
        });
        return { data: { seedPath, seed: seedOrError } };
    }
    /**
     * Add seed metadata.
     * @returns
     */
    async addSeedMetadata({ seed, wsRoot, onUpdatingWorkspace, onUpdatedWorkspace, }) {
        const ws = new workspace_1.WorkspaceService({ wsRoot });
        const config = common_server_1.DConfig.readConfigSync(wsRoot);
        const id = utils_1.SeedUtils.getSeedId({ ...seed });
        const seeds = common_all_1.ConfigUtils.getWorkspace(config).seeds || {};
        const seedEntry = {};
        if (seed.site) {
            seedEntry.site = seed.site;
        }
        seeds[id] = seedEntry;
        common_all_1.ConfigUtils.setWorkspaceProp(config, "seeds", seeds);
        const updateWorkspace = (await workspace_1.WorkspaceUtils.getWorkspaceTypeFromDir(wsRoot)) ===
            common_all_1.WorkspaceType.CODE;
        await ws.addVault({
            vault: utils_1.SeedUtils.seed2Vault({ seed }),
            config,
            updateConfig: true,
            updateWorkspace,
            onUpdatingWorkspace,
            onUpdatedWorkspace,
        });
        ws.dispose();
        return { seed };
    }
    /**
     *
     * @param branch - optional branch to clone from
     * @returns
     */
    async cloneSeed({ seed, branch }) {
        const wsRoot = this.wsRoot;
        const id = utils_1.SeedUtils.getSeedId(seed);
        const spath = utils_1.SeedUtils.seed2Path({ wsRoot, id });
        fs_extra_1.default.ensureDirSync(path_1.default.dirname(spath));
        const git = (0, common_server_1.simpleGit)({ baseDir: wsRoot });
        if (branch) {
            await git.clone(seed.repository.url, spath, { "--branch": "dev" });
        }
        else {
            await git.clone(seed.repository.url, spath);
        }
        return spath;
    }
    async init(opts) {
        const { wsRoot, seed, mode } = opts;
        const cpath = path_1.default.join(wsRoot, common_all_1.CONSTANTS.DENDRON_SEED_CONFIG);
        switch (mode) {
            case SeedInitMode.CREATE_WORKSPACE: {
                // write seed config
                (0, common_server_1.writeYAML)(cpath, seed);
                const ws = await workspace_1.WorkspaceService.createWorkspace({
                    wsRoot,
                    createCodeWorkspace: true,
                });
                const config = ws.config;
                await ws.createVault({
                    vault: { fsPath: "vault" },
                    updateWorkspace: true,
                    config,
                    updateConfig: false,
                });
                await ws.setConfig(config);
                ws.dispose();
                break;
            }
            case SeedInitMode.CONVERT_WORKSPACE: {
                const { error } = utils_1.SeedUtils.validateWorkspaceSeedConversion({ wsRoot });
                if (error) {
                    return {
                        error,
                    };
                }
                const config = workspace_1.WorkspaceService.getOrCreateConfig(wsRoot);
                const vaults = common_all_1.ConfigUtils.getVaults(config);
                const vaultPath = common_all_1.VaultUtils.getRelPath(vaults[0]);
                seed.root = vaultPath;
                (0, common_server_1.writeYAML)(cpath, seed);
                // validate
                break;
            }
            default:
                (0, common_all_1.assertUnreachable)(mode);
        }
        return {
            data: {
                seed,
            },
        };
    }
    async info({ id }) {
        const resp = this.registry.info({ id });
        return resp;
    }
    async removeSeed({ id, onUpdatingWorkspace, onUpdatedWorkspace, }) {
        const config = workspace_1.WorkspaceService.getOrCreateConfig(this.wsRoot);
        const seeds = common_all_1.ConfigUtils.getWorkspace(config).seeds;
        if (!lodash_1.default.has(seeds, id)) {
            return {
                error: new common_all_1.DendronError({
                    status: common_all_1.ERROR_STATUS.DOES_NOT_EXIST,
                    message: `seed with id ${id} not in dendron.yml`,
                }),
            };
        }
        const seedOrError = await this.getSeedOrErrorFromId(id);
        if (seedOrError instanceof common_all_1.DendronError) {
            return {
                error: seedOrError,
            };
        }
        // Folder cleanup must occur before the metadata changes - if the current
        // workspace that is open is the one being modified in addSeedMetadata(), VS
        // Code will reload the current window and the seed cloning may not execute.
        const spath = utils_1.SeedUtils.seed2Path({ wsRoot: this.wsRoot, id });
        if (fs_extra_1.default.pathExistsSync(spath)) {
            fs_extra_1.default.removeSync(spath);
        }
        await this.removeSeedMetadata({
            seed: seedOrError,
            onUpdatingWorkspace,
            onUpdatedWorkspace,
        });
        return { data: { seed: seedOrError } };
    }
    async removeSeedMetadata({ seed, onUpdatingWorkspace, onUpdatedWorkspace, }) {
        const ws = new workspace_1.WorkspaceService({ wsRoot: this.wsRoot });
        // remove seed entry
        const config = ws.config;
        const seeds = common_all_1.ConfigUtils.getWorkspace(config).seeds || {};
        delete seeds[utils_1.SeedUtils.getSeedId(seed)];
        common_all_1.ConfigUtils.setWorkspaceProp(config, "seeds", seeds);
        await ws.setConfig(config);
        const updateWorkspace = (await workspace_1.WorkspaceUtils.getWorkspaceTypeFromDir(this.wsRoot)) ===
            common_all_1.WorkspaceType.CODE;
        await ws.removeVault({
            vault: utils_1.SeedUtils.seed2Vault({ seed }),
            updateWorkspace,
            onUpdatingWorkspace,
            onUpdatedWorkspace,
        });
        ws.dispose();
    }
    isSeedInWorkspace(id) {
        const config = workspace_1.WorkspaceService.getOrCreateConfig(this.wsRoot);
        const vaults = common_all_1.ConfigUtils.getVaults(config);
        return undefined !== vaults.find((vault) => vault.seed === id);
    }
    getSeedVaultsInWorkspace() {
        const config = workspace_1.WorkspaceService.getOrCreateConfig(this.wsRoot);
        const vaults = common_all_1.ConfigUtils.getVaults(config);
        return vaults.filter(common_all_1.VaultUtils.isSeed);
    }
    getSeedsInWorkspace() {
        return this.getSeedVaultsInWorkspace().map((vault) => vault.seed);
    }
}
exports.SeedService = SeedService;
//# sourceMappingURL=service.js.map