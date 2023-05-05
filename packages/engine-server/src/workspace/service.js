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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceService = void 0;
const common_all_1 = require("@dendronhq/common-all");
const common_server_1 = require("@dendronhq/common-server");
const fs_extra_1 = __importDefault(require("fs-extra"));
const lodash_1 = __importDefault(require("lodash"));
const os_1 = __importDefault(require("os"));
const path_1 = __importStar(require("path"));
const vscode_uri_1 = require("vscode-uri");
const _1 = require(".");
const metadata_1 = require("../metadata");
const migrations_1 = require("../migrations");
const seed_1 = require("../seed");
const git_1 = require("../topics/git");
const utils_1 = require("../utils");
const vscode_1 = require("./vscode");
const workspaceServiceInterface_1 = require("./workspaceServiceInterface");
const DENDRON_WS_NAME = common_all_1.CONSTANTS.DENDRON_WS_NAME;
const ROOT_NOTE_TEMPLATE = [
    "# Welcome to Dendron",
    "",
    `This is the root of your dendron vault. If you decide to publish your entire vault, this will be your landing page. You are free to customize any part of this page except the frontmatter on top.`,
    "",
    "## Lookup",
    "",
    "This section contains useful links to related resources.",
    "",
    "- [Getting Started Guide](https://link.dendron.so/6b25)",
    "- [Discord](https://link.dendron.so/6b23)",
    "- [Home Page](https://wiki.dendron.so/)",
    "- [Github](https://link.dendron.so/6b24)",
    "- [Developer Docs](https://docs.dendron.so/)",
].join("\n");
/** You **must** dispose workspace services you create, otherwise you risk leaking file descriptors which may lead to crashes. */
class WorkspaceService {
    static isNewVersionGreater({ oldVersion, newVersion, }) {
        return common_all_1.DUtils.semver.lt(oldVersion, newVersion);
    }
    static async isWorkspaceVault(fpath) {
        return (
        // Config file exists
        (await fs_extra_1.default.pathExists(path_1.default.join(fpath, common_all_1.CONSTANTS.DENDRON_CONFIG_FILE))) &&
            // And is not a self contained vault
            !(await fs_extra_1.default.pathExists(path_1.default.join(fpath, common_all_1.FOLDERS.NOTES))));
    }
    /** Reminder: you **must** dispose workspace services you create, otherwise you risk leaking file descriptors which may lead to crashes. */
    constructor({ wsRoot, seedService }) {
        this.wsRoot = wsRoot;
        const { logger, dispose } = (0, common_server_1.createDisposableLogger)();
        this.logger = logger;
        this.loggerDispose = dispose;
        this._seedService = seedService || new seed_1.SeedService({ wsRoot });
    }
    dispose() {
        this.loggerDispose();
    }
    get user() {
        const fpath = path_1.default.join(this.wsRoot, common_all_1.CONSTANTS.DENDRON_USER_FILE);
        if (fs_extra_1.default.existsSync(fpath)) {
            return new common_all_1.DUser(lodash_1.default.trim(fs_extra_1.default.readFileSync(fpath, { encoding: "utf8" })));
        }
        else {
            return common_all_1.DUser.createAnonymous();
        }
    }
    /**
     * @deprecated: not applicable for self cotnained vaults
     */
    static getOrCreateConfig(wsRoot) {
        return common_server_1.DConfig.getOrCreate(wsRoot);
    }
    get config() {
        // TODO: don't read all the time but cache
        const { error, data } = common_server_1.DConfig.readConfigAndApplyLocalOverrideSync(this.wsRoot);
        if (error)
            this.logger.error((0, common_all_1.stringifyError)(error));
        return data;
    }
    get seedService() {
        return this._seedService;
    }
    // NOTE: this is not accurate until the workspace is initialized
    get vaults() {
        return this.config.workspace.vaults;
    }
    async setConfig(config) {
        const wsRoot = this.wsRoot;
        return common_server_1.DConfig.writeConfig({ wsRoot, config });
    }
    setCodeWorkspaceSettingsSync(config) {
        (0, common_server_1.writeJSONWithCommentsSync)(path_1.default.join(this.wsRoot, common_all_1.CONSTANTS.DENDRON_WS_NAME), config);
    }
    getCodeWorkspaceSettingsSync() {
        const resp = _1.WorkspaceUtils.getCodeWorkspaceSettingsSync(this.wsRoot);
        if (resp.error) {
            this.logger.error(resp.error);
            return undefined;
        }
        return resp.data;
    }
    /**
     *
     * @param param0
     * @returns `{vaults}` that have been added
     */
    async addWorkspace({ workspace }) {
        const config = common_server_1.DConfig.readConfigSync(this.wsRoot);
        const allWorkspaces = common_all_1.ConfigUtils.getWorkspace(config).workspaces || {};
        allWorkspaces[workspace.name] = lodash_1.default.omit(workspace, ["name", "vaults"]);
        // update vault
        const newVaults = await lodash_1.default.reduce(workspace.vaults, async (acc, vault) => {
            const out = await acc;
            out.push(await this.addVault({
                config,
                vault: { ...vault, workspace: workspace.name },
                updateConfig: false,
            }));
            return out;
        }, Promise.resolve([]));
        common_all_1.ConfigUtils.setWorkspaceProp(config, "workspaces", allWorkspaces);
        await this.setConfig(config);
        return { vaults: newVaults };
    }
    /**
     *
     *
     * @param opts.vault - {@link DVault} to add to workspace
     * @param opts.config - if passed it, make modifications on passed in config instead of {wsRoot}/dendron.yml
     * @param opts.updateConfig - default: true, add to dendron.yml
     * @param opts.updateWorkspace - default: false, add to dendron.code-workspace. Make sure to keep false for Native workspaces.
     * @returns
     */
    async addVault(opts) {
        const { vault, updateConfig, updateWorkspace } = lodash_1.default.defaults(opts, {
            updateConfig: true,
            updateWorkspace: false,
        });
        let { config } = opts;
        // if we are updating the config, we should make sure
        // we don't include the local overrides
        if (config === undefined) {
            config = this.config;
            if (updateConfig) {
                config = common_server_1.DConfig.readConfigSync(this.wsRoot);
            }
        }
        // Normalize the vault path to unix style (forward slashes) which is better for cross-compatibility
        vault.fsPath = (0, common_all_1.normalizeUnixPath)(vault.fsPath);
        const vaults = common_all_1.ConfigUtils.getVaults(config);
        vaults.unshift(vault);
        common_all_1.ConfigUtils.setVaults(config, vaults);
        // update dup note behavior
        const publishingConfig = common_all_1.ConfigUtils.getPublishing(config);
        if (!publishingConfig.duplicateNoteBehavior) {
            const vaults = common_all_1.ConfigUtils.getVaults(config);
            const updatedDuplicateNoteBehavior = {
                action: "useVault",
                payload: vaults.map((v) => common_all_1.VaultUtils.getName(v)),
            };
            common_all_1.ConfigUtils.setDuplicateNoteBehavior(config, updatedDuplicateNoteBehavior);
        }
        else if (lodash_1.default.isArray(publishingConfig.duplicateNoteBehavior.payload)) {
            const updatedDuplicateNoteBehavior = publishingConfig.duplicateNoteBehavior;
            updatedDuplicateNoteBehavior.payload.push(common_all_1.VaultUtils.getName(vault));
            common_all_1.ConfigUtils.setDuplicateNoteBehavior(config, updatedDuplicateNoteBehavior);
        }
        if (updateConfig) {
            await this.setConfig(config);
        }
        if (updateWorkspace) {
            const wsPath = path_1.default.join(this.wsRoot, DENDRON_WS_NAME);
            let out = (await (0, common_server_1.readJSONWithComments)(wsPath));
            if (!lodash_1.default.find(out.folders, (ent) => ent.path === common_all_1.VaultUtils.getRelPath(vault))) {
                const vault2Folder = common_all_1.VaultUtils.toWorkspaceFolder(vault);
                const folders = [vault2Folder].concat(out.folders);
                out = (0, common_server_1.assignJSONWithComment)({ folders }, out);
                if (opts.onUpdatingWorkspace) {
                    await opts.onUpdatingWorkspace();
                }
                await (0, common_server_1.writeJSONWithComments)(wsPath, out);
                if (opts.onUpdatedWorkspace) {
                    await opts.onUpdatedWorkspace();
                }
            }
        }
        else {
            // Run the hooks even if not updating the workspace file (native workspace), because other code depends on it.
            if (opts.onUpdatingWorkspace) {
                await opts.onUpdatingWorkspace();
            }
            if (opts.onUpdatedWorkspace) {
                await opts.onUpdatedWorkspace();
            }
        }
        return vault;
    }
    /**
     * Create vault files if it does not exist
     * @param opts.noAddToConfig: don't add to dendron.yml
     * @param opts.addToCodeWorkspace: add to dendron.code-workspace
     * @returns void
     *
     * Effects:
     *   - updates `dendron.yml` if `noAddToConfig` is not set
     *   - create directory
     *   - create root note and root schema
     */
    async createVault(opts) {
        const { vault, noAddToConfig } = opts;
        const vpath = (0, common_server_1.vault2Path)({ vault, wsRoot: this.wsRoot });
        await fs_extra_1.default.ensureDir(vpath);
        const note = common_all_1.NoteUtils.createRoot({
            vault,
            body: ROOT_NOTE_TEMPLATE,
        });
        const schema = common_all_1.SchemaUtils.createRootModule({ vault });
        if (!fs_extra_1.default.existsSync(common_all_1.NoteUtils.getFullPath({ note, wsRoot: this.wsRoot }))) {
            await (0, common_server_1.note2File)({ note, vault, wsRoot: this.wsRoot });
        }
        if (!fs_extra_1.default.existsSync(common_all_1.SchemaUtils.getPath({ root: vpath, fname: "root" }))) {
            await (0, common_server_1.schemaModuleOpts2File)(schema, vpath, "root");
        }
        if (!noAddToConfig) {
            await this.addVault({ ...opts, updateWorkspace: false });
        }
        if (opts.addToCodeWorkspace || opts.updateWorkspace) {
            await this.addVaultToCodeWorkspace(vault);
        }
        return vault;
    }
    /** Creates the given vault.
     *
     * @param vault Must be a self contained vault. Use
     * {@link VaultUtils.selfContained} to ensure this is correct, which will
     * allow the type to match.
     * @param addToConfig If true, the created vault will be added to the config
     * for the current workspace.
     * @param addToCodeWorkspace If true, the created vault will be added to the
     * `code-workspace` file for the current workspace.
     * @param newVault If true, the root note and schema files, and workspace
     * files will be created inside the vault.
     */
    async createSelfContainedVault(opts) {
        const { vault, addToConfig, addToCodeWorkspace } = opts;
        /** The `vault` folder */
        const vaultPath = path_1.default.join(this.wsRoot, vault.fsPath);
        /** The `vault/notes` folder */
        const notesPath = path_1.default.join(vaultPath, common_all_1.FOLDERS.NOTES);
        // Create the folders we want for this vault.
        await fs_extra_1.default.mkdirp(notesPath);
        await fs_extra_1.default.mkdirp(path_1.default.join(notesPath, "assets"));
        if (opts.newVault) {
            // Create root note and schema
            const note = common_all_1.NoteUtils.createRoot({
                vault,
                body: ROOT_NOTE_TEMPLATE,
            });
            const schema = common_all_1.SchemaUtils.createRootModule({ vault });
            if (!(await fs_extra_1.default.pathExists(common_all_1.NoteUtils.getFullPath({ note, wsRoot: this.wsRoot })))) {
                await (0, common_server_1.note2File)({ note, vault, wsRoot: this.wsRoot });
            }
            if (!(await fs_extra_1.default.pathExists(common_all_1.SchemaUtils.getPath({ root: notesPath, fname: "root" })))) {
                await (0, common_server_1.schemaModuleOpts2File)(schema, notesPath, "root");
            }
            // Create the config and code-workspace for the vault, which make it self contained.
            // This is the config that goes inside the vault itself
            const selfContainedVaultConfig = {
                fsPath: ".",
                selfContained: true,
            };
            if (vault.name)
                selfContainedVaultConfig.name = vault.name;
            // create dendron.yml
            common_server_1.DConfig.createSync({
                wsRoot: vaultPath,
                defaults: {
                    dev: {
                        enableSelfContainedVaults: true,
                    },
                    workspace: {
                        vaults: [selfContainedVaultConfig],
                    },
                },
            });
            // create dendron.code-workspace
            vscode_1.WorkspaceConfig.write(vaultPath, [], {
                overrides: {
                    folders: [
                        {
                            // Following how we set up workspace config for workspaces, where
                            // the root is the `vault` directory
                            path: "notes",
                            name: common_all_1.VaultUtils.getName(vault),
                        },
                    ],
                    settings: {
                        // Also enable the self contained vault workspaces when inside the self contained vault
                        [common_all_1.DENDRON_VSCODE_CONFIG_KEYS.ENABLE_SELF_CONTAINED_VAULTS_WORKSPACE]: true,
                    },
                },
            });
            // Also add a gitignore, so files like `.dendron.port` are ignored if the
            // self contained vault is opened on its own
            await WorkspaceService.createGitIgnore(vaultPath);
        }
        // Update the config and code-workspace for the current workspace
        if (addToConfig) {
            await this.addVault({ ...opts, updateWorkspace: false });
        }
        if (addToCodeWorkspace) {
            await this.addVaultToCodeWorkspace(vault);
        }
        return vault;
    }
    async migrateVaultToSelfContained({ vault }) {
        var _a;
        const backupInfix = "migrate-vault-sc";
        if (vault.seed) {
            // Unsupported vaults are filtered in the commands that use this function,
            // but also adding a sanity check here.
            throw new common_all_1.DendronError({
                message: "Seed vaults are not yet supported for automated migration.",
            });
        }
        const newVault = {
            ...lodash_1.default.omit(vault, "workspace"),
            selfContained: true,
        };
        // This will be something like wsRoot/vault
        const oldFolder = (0, common_server_1.vault2Path)({ wsRoot: this.wsRoot, vault });
        // And this will be a subfolder like wsRoot/vault/notes
        const newFolder = (0, common_server_1.vault2Path)({ wsRoot: this.wsRoot, vault: newVault });
        await fs_extra_1.default.ensureDir(newFolder);
        // Move all note files
        const noteFiles = await (0, common_server_1.getAllFiles)({
            root: vscode_uri_1.URI.file(oldFolder),
            include: ["*.md"],
        });
        if (!noteFiles.data) {
            throw noteFiles.error;
        }
        await Promise.all(noteFiles.data.map(async (from) => {
            await fs_extra_1.default.move(path_1.default.join(oldFolder, from), path_1.default.join(newFolder, from));
        }));
        // Move assets, if they exist
        await (0, common_server_1.moveIfExists)(path_1.default.join(oldFolder, common_all_1.FOLDERS.ASSETS), path_1.default.join(newFolder, common_all_1.FOLDERS.ASSETS));
        // Update the config to mark this vault as self contained
        const config = common_server_1.DConfig.getRaw(this.wsRoot);
        const configVault = common_all_1.ConfigUtils.getVaults(config).find((confVault) => common_all_1.VaultUtils.isEqualV2(confVault, vault));
        if (configVault)
            configVault.selfContained = true;
        // Update logoPath if needed
        let logoPath = (_a = config.publishing) === null || _a === void 0 ? void 0 : _a.logoPath;
        if (
        // If the logo exists, and it was an asset inside the vault we're migrating
        config.publishing &&
            logoPath &&
            !(0, common_all_1.isWebUri)(logoPath) &&
            logoPath.startsWith(common_all_1.VaultUtils.getRelPath(vault))) {
            // Then we need to update the logo path for the new path
            logoPath = logoPath.slice(common_all_1.VaultUtils.getRelPath(vault).length);
            logoPath = common_all_1.VaultUtils.getRelPath(newVault) + logoPath;
            config.publishing.logoPath = logoPath;
        }
        // All updates to the config are done, finish by writing it
        await common_server_1.DConfig.createBackup(this.wsRoot, backupInfix);
        await common_server_1.DConfig.writeConfig({ wsRoot: this.wsRoot, config });
        const workspaceService = new WorkspaceService({
            wsRoot: oldFolder,
        });
        const vaultConfig = {
            // The config to be placed inside the vault, to function as a self contained vault
            ...lodash_1.default.omit(newVault, "remote"),
            fsPath: ".",
        };
        // Create or update the config file (dendron.yml) inside the wsRoot/vault
        if (!(await fs_extra_1.default.pathExists(path_1.default.join(oldFolder, common_all_1.CONSTANTS.DENDRON_CONFIG_FILE)))) {
            // No existing config, so create new one
            await workspaceService.createSelfContainedVault({
                addToCodeWorkspace: false,
                addToConfig: true,
                vault: vaultConfig,
                newVault: true,
            });
        }
        else {
            // There's already a config file in the vault, update the existing one
            await common_server_1.DConfig.createBackup(oldFolder, backupInfix);
            const config = common_server_1.DConfig.getOrCreate(oldFolder);
            common_all_1.ConfigUtils.setVaults(config, [vaultConfig]);
            await common_server_1.DConfig.writeConfig({ wsRoot: oldFolder, config });
        }
        // Create or update the workspace file (dendron.code-workspace) inside the wsRoot/vault
        if (!(await fs_extra_1.default.pathExists(path_1.default.join(oldFolder, common_all_1.CONSTANTS.DENDRON_WS_NAME)))) {
            // No existing config, create a new one
            await workspaceService.createSelfContainedVault({
                addToCodeWorkspace: true,
                addToConfig: false,
                vault: vaultConfig,
                newVault: true,
            });
        }
        else {
            // There's already a config file in the vault, update the existing one
            await _1.WorkspaceUtils.updateCodeWorkspaceSettings({
                wsRoot: oldFolder,
                updateCb: (settings) => {
                    settings.folders = [
                        {
                            path: common_all_1.FOLDERS.NOTES,
                            name: common_all_1.VaultUtils.getName(newVault),
                        },
                    ];
                    return settings;
                },
            });
        }
        workspaceService.dispose();
        // Update the config for the vault
        return newVault;
    }
    markVaultAsRemoteInConfig(targetVault, remoteUrl) {
        const config = this.config;
        const vaults = common_all_1.ConfigUtils.getVaults(config);
        common_all_1.ConfigUtils.setVaults(config, vaults.map((vault) => {
            if (common_all_1.VaultUtils.isEqualV2(vault, targetVault)) {
                vault.remote = { type: "git", url: remoteUrl };
            }
            return vault;
        }));
        return this.setConfig(config);
    }
    /** Converts a local vault to a remote vault, with `remoteUrl` as the upstream URL. */
    async convertVaultRemote({ wsRoot, vault: targetVault, remoteUrl, }) {
        var _a;
        // Now, initialize a repository in it
        const git = new git_1.Git({
            localUrl: path_1.default.join(wsRoot, targetVault.fsPath),
            remoteUrl,
        });
        if (!(await fs_extra_1.default.pathExists(path_1.default.join(wsRoot, targetVault.fsPath, ".git")))) {
            // Avoid initializing if a git folder already exists
            await git.init();
        }
        let remote = await git.getRemote();
        if (!remote) {
            remote = await git.remoteAdd();
        }
        else {
            await git.remoteSet(remote);
        }
        const branch = await git.getCurrentBranch();
        // Add the contents of the vault and push to initialize the upstream
        await git.addAll();
        try {
            await git.commit({ msg: "Set up remote vault" });
        }
        catch (err) {
            // Ignore it if commit fails, it might happen if the vault if empty or if it was already a repo
            if (!lodash_1.default.isNumber(err === null || err === void 0 ? void 0 : err.exitCode))
                throw err;
        }
        await git.push({ remote, branch });
        // Remove the vault folder from the tree of the root repository. Otherwise, the files will be there when
        // someone else pulls the root repo, which can break remote vault initialization. This doesn't delete the actual files.
        if (await fs_extra_1.default.pathExists(path_1.default.join(wsRoot, ".git"))) {
            // But only if the workspace is in a git repository, otherwise skip this step.
            const rootGit = new git_1.Git({ localUrl: wsRoot });
            await rootGit.rm({
                cached: true,
                recursive: true,
                path: targetVault.fsPath,
            });
        }
        const config = this.config;
        common_all_1.ConfigUtils.updateVault(config, targetVault, (vault) => {
            vault.remote = {
                type: "git",
                url: remoteUrl,
            };
            return vault;
        });
        let ignorePath = targetVault.fsPath;
        if ((_a = config.dev) === null || _a === void 0 ? void 0 : _a.enableSelfContainedVaults) {
            // Move vault folder to the correct location
            const newVaultPath = common_server_1.GitUtils.getDependencyPathWithRemote({
                vault: targetVault,
                remote: remoteUrl,
            });
            await fs_extra_1.default.move(path_1.default.join(wsRoot, targetVault.fsPath), path_1.default.join(wsRoot, newVaultPath));
            common_all_1.ConfigUtils.updateVault(config, targetVault, (vault) => {
                vault.fsPath = newVaultPath;
                return vault;
            });
            ignorePath = newVaultPath;
        }
        // Add the vault to the gitignore of root, so that it doesn't show up as part of root anymore
        await common_server_1.GitUtils.addToGitignore({
            addPath: ignorePath,
            root: wsRoot,
        });
        await this.setConfig(config);
        return { remote, branch };
    }
    /** Converts a remote vault to a local vault.
     *
     * If self contained vaults are enabled in the config, it will also move the
     * vault folder to `dependencies/localhost/`. It will not convert the vault
     * into a self contained vault however.
     */
    async convertVaultLocal({ wsRoot, vault: targetVault, }) {
        var _a;
        // Remove vault from gitignore of root, if it's there, so it's part of root workspace again
        await common_server_1.GitUtils.removeFromGitignore({
            removePath: targetVault.fsPath,
            root: wsRoot,
        });
        // Remove the .git folder from the vault
        const gitFolder = path_1.default.join(wsRoot, targetVault.fsPath, ".git");
        await fs_extra_1.default.rm(gitFolder, {
            recursive: true,
            force: true /* It's OK if dir doesn't exist */,
        });
        // Update `dendron.yml`, removing the remote from the converted vault
        const config = this.config;
        common_all_1.ConfigUtils.updateVault(config, targetVault, (vault) => {
            delete vault.remote;
            return vault;
        });
        if ((_a = config.dev) === null || _a === void 0 ? void 0 : _a.enableSelfContainedVaults) {
            // Move vault folder to the correct location
            const newVaultPath = common_server_1.GitUtils.getDependencyPathWithRemote({
                vault: targetVault,
                remote: null,
            });
            await fs_extra_1.default.move(path_1.default.join(wsRoot, targetVault.fsPath), path_1.default.join(wsRoot, newVaultPath));
            common_all_1.ConfigUtils.updateVault(config, targetVault, (vault) => {
                vault.fsPath = newVaultPath;
                return vault;
            });
        }
        await this.setConfig(config);
    }
    /** For vaults in the same repository, ensure that their sync configurations do not conflict. Returns the coordinated sync config. */
    verifyVaultSyncConfigs(vaults) {
        let prevVault;
        for (const vault of vaults) {
            if (lodash_1.default.isUndefined(vault.sync))
                continue;
            if (lodash_1.default.isUndefined(prevVault)) {
                prevVault = vault;
                continue;
            }
            if (prevVault.sync === vault.sync)
                continue;
            const prevVaultName = prevVault.name || prevVault.fsPath;
            const vaultName = vault.name || vault.fsPath;
            throw new common_all_1.DendronError({
                message: `Vaults ${prevVaultName} and ${vaultName} are in the same repository, but have conflicting configurations ${prevVault.sync} and ${vault.sync} set. Please remove conflicting configuration, or move vault to a different repository.`,
            });
        }
        return prevVault === null || prevVault === void 0 ? void 0 : prevVault.sync;
    }
    /** Checks if a given git command should be used on the vault based on user configuration.
     *
     * @param command The git command that we want to perform.
     * @param repo The location of the repository containing the vaults.
     * @param vaults The vaults on which the operation is being performed on.
     * @returns true if the command can be performed, false otherwise.
     */
    async shouldVaultsSync(command, [root, vaults]) {
        let workspaceVaultSyncConfig = this.verifyVaultSyncConfigs(vaults);
        if (lodash_1.default.isUndefined(workspaceVaultSyncConfig)) {
            if (await WorkspaceService.isWorkspaceVault(root)) {
                workspaceVaultSyncConfig = common_all_1.ConfigUtils.getWorkspace(this.config)
                    .workspaceVaultSyncMode;
                // default for workspace vaults
                if (lodash_1.default.isUndefined(workspaceVaultSyncConfig)) {
                    workspaceVaultSyncConfig = common_all_1.DVaultSync.NO_COMMIT;
                }
            }
            // default for regular vaults
            else
                workspaceVaultSyncConfig = common_all_1.DVaultSync.SYNC;
        }
        if (workspaceVaultSyncConfig === common_all_1.DVaultSync.SKIP)
            return false;
        if (workspaceVaultSyncConfig === common_all_1.DVaultSync.SYNC)
            return true;
        if (workspaceVaultSyncConfig === common_all_1.DVaultSync.NO_COMMIT &&
            command === "commit")
            return false;
        if (workspaceVaultSyncConfig === common_all_1.DVaultSync.NO_PUSH && command === "push")
            return false;
        return true;
    }
    static async generateCommitMessage({ vaults, engine, }) {
        const { version } = (await engine.info()).data || { version: "unknown" };
        return [
            "Dendron workspace sync",
            "",
            "## Synced vaults:",
            ...vaults.map((vault) => `- ${common_all_1.VaultUtils.getName(vault)}`),
            "",
            `Dendron version: ${version}`,
            `Hostname: ${os_1.default.hostname()}`,
        ].join("\n");
    }
    async getAllReposNumContributors() {
        const repos = await this.getAllRepos();
        const contributors = await Promise.all(repos.map((repo) => {
            const git = new git_1.Git({ localUrl: repo });
            try {
                return git.getNumContributors();
            }
            catch {
                return 0;
            }
        }));
        return contributors.filter(common_all_1.isNotUndefined);
    }
    /**
     * Try to get the url of the top level repository.
     * If self contained vault, workspace root should be the top level if remotely tracked.
     * If not self contained, workspace root should be the top level if remotely tracked.
     * If not self contained vault, and workspace root doesn't have a remote url,
     *   This means nothing is remotely tracked, or some vaults in the workspace is tracked, not the workspace itself.
     *   In this case, it is ambiguous what the top level is, and we assume the top level is not tracked remotely.
     * @returns remote url or undefined
     */
    async getTopLevelRemoteUrl() {
        const git = new git_1.Git({ localUrl: this.wsRoot });
        const remoteUrl = await git.getRemoteUrl();
        return remoteUrl;
    }
    async commitAndAddAll({ engine, }) {
        const allReposVaults = await this.getAllReposVaults();
        const out = await Promise.all(lodash_1.default.map([...allReposVaults.entries()], async (rootVaults) => {
            const [repo, vaults] = rootVaults;
            const git = new git_1.Git({ localUrl: repo });
            if (!(await this.shouldVaultsSync("commit", rootVaults)))
                return { repo, vaults, status: workspaceServiceInterface_1.SyncActionStatus.SKIP_CONFIG };
            if (await git.hasMergeConflicts())
                return { repo, vaults, status: workspaceServiceInterface_1.SyncActionStatus.MERGE_CONFLICT };
            if (await git.hasRebaseInProgress()) {
                // try to resume the rebase first, since we know there are no merge conflicts
                return {
                    repo,
                    vaults,
                    status: workspaceServiceInterface_1.SyncActionStatus.REBASE_IN_PROGRESS,
                };
            }
            if (!(await git.hasChanges()))
                return { repo, vaults, status: workspaceServiceInterface_1.SyncActionStatus.NO_CHANGES };
            try {
                await git.addAll();
                await git.commit({
                    msg: await WorkspaceService.generateCommitMessage({
                        vaults,
                        engine,
                    }),
                });
                return { repo, vaults, status: workspaceServiceInterface_1.SyncActionStatus.DONE };
            }
            catch (err) {
                const stderr = err.stderr ? `: ${err.stderr}` : "";
                throw new common_all_1.DendronError({
                    message: `error adding and committing vault${stderr}`,
                    payload: { err, repoPath: repo },
                });
            }
        }));
        return out;
    }
    /**
     * Initialize all remote vaults
     * @param opts
     * @returns
     */
    async initialize(opts) {
        const { onSyncVaultsProgress, onSyncVaultsEnd } = lodash_1.default.defaults(opts, {
            onSyncVaultsProgress: () => { },
            onSyncVaultsEnd: () => { },
        });
        const initializeRemoteVaults = common_all_1.ConfigUtils.getWorkspace(this.config).enableRemoteVaultInit;
        if (initializeRemoteVaults) {
            const { didClone } = await this.syncVaults({
                config: this.config,
                progressIndicator: onSyncVaultsProgress,
            });
            if (didClone) {
                onSyncVaultsEnd();
            }
            return didClone;
        }
        return false;
    }
    /**
     * Remove vaults. Currently doesn't delete any files.
     * @param param0
     */
    async removeVault(opts) {
        const { vault, updateConfig, updateWorkspace } = lodash_1.default.defaults(opts, {
            updateConfig: true,
            updateWorkspace: false,
        });
        // if we are updating the config, we should make sure
        // we don't include the local overrides
        const config = updateConfig
            ? common_server_1.DConfig.readConfigSync(this.wsRoot)
            : this.config;
        const vaults = common_all_1.ConfigUtils.getVaults(config);
        const vaultsAfterReject = lodash_1.default.reject(vaults, (ent) => {
            return (
            // Same vault, and
            common_all_1.VaultUtils.isEqualV2(ent, vault) &&
                // Either not a workspace vault, or the same workspace
                (!vault.workspace || ent.workspace === vault.workspace));
        });
        common_all_1.ConfigUtils.setVaults(config, vaultsAfterReject);
        const workspaces = common_all_1.ConfigUtils.getWorkspace(config).workspaces;
        if (vault.workspace && workspaces) {
            const vaultWorkspace = lodash_1.default.find(common_all_1.ConfigUtils.getVaults(config), {
                workspace: vault.workspace,
            });
            if (lodash_1.default.isUndefined(vaultWorkspace)) {
                delete workspaces[vault.workspace];
                common_all_1.ConfigUtils.setWorkspaceProp(config, "workspaces", workspaces);
            }
        }
        const publishingConfig = common_all_1.ConfigUtils.getPublishing(config);
        if (publishingConfig.duplicateNoteBehavior &&
            lodash_1.default.isArray(publishingConfig.duplicateNoteBehavior.payload)) {
            const vaults = common_all_1.ConfigUtils.getVaults(config);
            if (vaults.length === 1) {
                // if there is only one vault left, remove duplicateNoteBehavior setting
                common_all_1.ConfigUtils.unsetDuplicateNoteBehavior(config);
            }
            else {
                // otherwise pull the removed vault from payload
                const updatedDuplicateNoteBehavior = publishingConfig.duplicateNoteBehavior;
                lodash_1.default.pull(updatedDuplicateNoteBehavior.payload, common_all_1.VaultUtils.getName(vault));
                common_all_1.ConfigUtils.setDuplicateNoteBehavior(config, updatedDuplicateNoteBehavior);
            }
        }
        if (updateConfig) {
            await this.setConfig(config);
        }
        const wsPath = path_1.default.join(this.wsRoot, DENDRON_WS_NAME);
        if (updateWorkspace && (await fs_extra_1.default.pathExists(wsPath))) {
            let settings = (await (0, common_server_1.readJSONWithComments)(wsPath));
            const folders = lodash_1.default.reject(settings.folders, (ent) => ent.path === common_all_1.VaultUtils.getRelPath(vault));
            settings = (0, common_server_1.assignJSONWithComment)({ folders }, settings);
            if (opts.onUpdatingWorkspace) {
                opts.onUpdatingWorkspace();
            }
            (0, common_server_1.writeJSONWithCommentsSync)(wsPath, settings);
            if (opts.onUpdatedWorkspace) {
                await opts.onUpdatedWorkspace();
            }
        }
        else {
            // Run the hooks even if not updating the workspace file (native workspace), because other code depends on it.
            if (opts.onUpdatingWorkspace) {
                opts.onUpdatingWorkspace();
            }
            if (opts.onUpdatedWorkspace) {
                await opts.onUpdatedWorkspace();
            }
        }
    }
    createConfig() {
        return WorkspaceService.getOrCreateConfig(this.wsRoot);
    }
    static async createGitIgnore(wsRoot) {
        const gitIgnore = path_1.default.join(wsRoot, ".gitignore");
        await fs_extra_1.default.writeFile(gitIgnore, [
            "node_modules",
            ".dendron.*",
            "build",
            "seeds",
            ".next",
            "pods/service-connections",
        ].join("\n"), { encoding: "utf8" });
    }
    /**
     * Initialize workspace with specified vaults
     * Files and folders created:
     * wsRoot/
     * - .gitignore
     * - dendron.yml
     * - {vaults}/
     *   - root.md
     *   - root.schema.yml
     *
     * NOTE: dendron.yml only gets created if you are adding a workspace...
     * @param opts
     */
    static async createWorkspace(opts) {
        if (opts.useSelfContainedVault) {
            return this.createSelfContainedVaultWorkspace(opts);
        }
        else {
            return this.createStandardWorkspace(opts);
        }
    }
    static async createStandardWorkspace(opts) {
        const { wsRoot, wsVault, additionalVaults } = lodash_1.default.defaults(opts, {
            additionalVaults: [],
        });
        // for a standard workspace, there is no difference btw a wsVault and any other vault
        const vaults = [wsVault, ...additionalVaults].filter((v) => !lodash_1.default.isUndefined(v));
        const ws = new WorkspaceService({ wsRoot });
        fs_extra_1.default.ensureDirSync(wsRoot);
        // this creates `dendron.yml`
        common_server_1.DConfig.createSync({
            wsRoot,
        });
        // add gitignore
        WorkspaceService.createGitIgnore(wsRoot);
        if (opts.createCodeWorkspace) {
            vscode_1.WorkspaceConfig.write(wsRoot, vaults);
        }
        await lodash_1.default.reduce(vaults, async (prev, vault) => {
            await prev;
            await ws.createVault({ vault });
            return;
        }, Promise.resolve());
        // check if this is the first workspace created
        if (lodash_1.default.isUndefined(metadata_1.MetadataService.instance().getMeta().firstWsInitialize)) {
            metadata_1.MetadataService.instance().setFirstWsInitialize();
        }
        return ws;
    }
    /** Given a standard vault, convert it into a self contained vault.
     *
     * The function **mutates** (modifies) the vault object. */
    static standardToSelfContainedVault(vault) {
        var _a;
        if (common_all_1.VaultUtils.isSelfContained(vault))
            return vault;
        if ((_a = vault.remote) === null || _a === void 0 ? void 0 : _a.url) {
            // Remote vault, calculate path based on the remote
            vault.fsPath = path_1.default.join(common_all_1.FOLDERS.DEPENDENCIES, common_server_1.GitUtils.remoteUrlToDependencyPath({
                vaultName: vault.name || (0, path_1.basename)(vault.fsPath),
                url: vault.remote.url,
            }));
        }
        else {
            // Local vault, calculate path for local deps
            vault.fsPath = path_1.default.join(common_all_1.FOLDERS.DEPENDENCIES, common_all_1.FOLDERS.LOCAL_DEPENDENCY, path_1.default.basename(vault.fsPath));
        }
        vault.selfContained = true;
        // Cast required, because TypeScript doesn't recognize `selfContained` is always set to true
        return vault;
    }
    /** Creates a new workspace where the workspace is a self contained vault.
     *
     * If the vaults passed to this function are not self contained vaults, they
     * will be converted to self contained vaults before being created. The vault
     * objects passed in are **mutated**.
     *
     * Further, the first vault given will be the self contained vault that is
     * used as the workspace root.
     */
    static async createSelfContainedVaultWorkspace(opts) {
        const { wsRoot, additionalVaults, wsVault } = opts;
        const ws = new WorkspaceService({ wsRoot });
        // the `notes` folder in a self contained vault
        // treat it differently - we don't want to add it to config since this happens automatically
        if (wsVault) {
            if (wsVault.name === undefined) {
                wsVault.name = path_1.default.basename(wsRoot);
            }
            wsVault.fsPath = ".";
            wsVault.selfContained = true;
            await ws.createSelfContainedVault({
                vault: wsVault,
                addToCodeWorkspace: false,
                addToConfig: false,
                newVault: true,
            });
        }
        // additional vaults
        if (additionalVaults) {
            // Mutate vault objects to convert them to self contained vaults. The
            // first vault will be skipped because the conversion is a no-op for
            // vaults that are already self contained.
            const selfContainedVaults = additionalVaults.map(WorkspaceService.standardToSelfContainedVault);
            // Needs to be done one at a time, otherwise config updates are racy
            await (0, common_all_1.asyncLoopOneAtATime)(selfContainedVaults, (vault) => {
                return ws.createSelfContainedVault({
                    vault,
                    addToCodeWorkspace: false,
                    addToConfig: true,
                    newVault: true,
                });
            });
        }
        // check if this is the first workspace created
        if (lodash_1.default.isUndefined(metadata_1.MetadataService.instance().getMeta().firstWsInitialize)) {
            metadata_1.MetadataService.instance().setFirstWsInitialize();
        }
        return ws;
    }
    static async createFromConfig(opts) {
        const { wsRoot } = opts;
        const config = common_server_1.DConfig.getOrCreate(wsRoot);
        const ws = new WorkspaceService({ wsRoot });
        const vaults = common_all_1.ConfigUtils.getVaults(config);
        await Promise.all(vaults.map(async (vault) => {
            return ws.cloneVaultWithAccessToken({ vault });
        }));
        ws.dispose();
        return;
    }
    async addVaultToCodeWorkspace(vault) {
        const wsRoot = this.wsRoot;
        // workspace file
        const wsPath = vscode_1.WorkspaceConfig.workspaceFile(wsRoot);
        let out;
        try {
            out = (await (0, common_server_1.readJSONWithComments)(wsPath));
        }
        catch (err) {
            // If the config file didn't exist, ignore the error
            if ((err === null || err === void 0 ? void 0 : err.code) === "ENOENT")
                return;
            throw err;
        }
        if (!lodash_1.default.find(out.folders, (ent) => ent.path === common_all_1.VaultUtils.getRelPath(vault))) {
            const vault2Folder = common_all_1.VaultUtils.toWorkspaceFolder(vault);
            const folders = [vault2Folder].concat(out.folders);
            out = (0, common_server_1.assignJSONWithComment)({ folders }, out);
            await (0, common_server_1.writeJSONWithComments)(wsPath, out);
        }
        return;
    }
    /**
     * Used in createFromConfig
     */
    async cloneVaultWithAccessToken(opts) {
        const { vault } = opts;
        if (!vault.remote || vault.remote.type !== "git") {
            throw new common_all_1.DendronError({ message: "cloning non-git vault" });
        }
        let remotePath = vault.remote.url;
        const localPath = (0, common_server_1.vault2Path)({ vault, wsRoot: this.wsRoot });
        const git = (0, common_server_1.simpleGit)();
        this.logger.info({ msg: "cloning", remotePath, localPath });
        const accessToken = process.env["GITHUB_ACCESS_TOKEN"];
        if (accessToken) {
            this.logger.info({ msg: "using access token" });
            remotePath = common_server_1.GitUtils.getGithubAccessTokenUrl({
                remotePath,
                accessToken,
            });
        }
        await git.clone(remotePath, localPath);
    }
    /**
     * Clone a vault from a remote source
     * @param opts.vault vaults field
     * @param opts.urlTransformer modify the git url
     */
    async cloneVault(opts) {
        const { vault, urlTransformer } = lodash_1.default.defaults(opts, {
            urlTransformer: lodash_1.default.identity,
        });
        const wsRoot = this.wsRoot;
        if (!vault.remote || vault.remote.type !== "git") {
            throw new common_all_1.DendronError({
                message: "Internal error: cloning non-git vault",
            });
        }
        const repoPath = (0, common_server_1.pathForVaultRoot)({ vault, wsRoot });
        this.logger.info({ msg: "cloning", repoPath });
        const git = (0, common_server_1.simpleGit)({ baseDir: wsRoot });
        await git.clone(urlTransformer(vault.remote.url), repoPath);
        return repoPath;
    }
    async cloneWorkspace(opts) {
        const { wsRoot, urlTransformer, workspace, wsName } = lodash_1.default.defaults(opts, {
            urlTransformer: lodash_1.default.identity,
        });
        const repoPath = path_1.default.join(wsRoot, wsName);
        const git = (0, common_server_1.simpleGit)({ baseDir: wsRoot });
        await git.clone(urlTransformer(workspace.remote.url), wsName);
        return repoPath;
    }
    async getVaultRepo(vault) {
        const vpath = (0, common_server_1.pathForVaultRoot)({ vault, wsRoot: this.wsRoot });
        return common_server_1.GitUtils.getGitRoot(vpath);
    }
    async getAllReposVaults() {
        const reposVaults = new Map();
        const vaults = common_all_1.ConfigUtils.getVaults(this.config);
        await Promise.all(vaults.map(async (vault) => {
            const repo = await this.getVaultRepo(vault);
            if (lodash_1.default.isUndefined(repo))
                return;
            const vaultsForRepo = reposVaults.get(repo) || [];
            vaultsForRepo.push(vault);
            reposVaults.set(repo, vaultsForRepo);
        }));
        return reposVaults;
    }
    async getAllRepos() {
        return [...(await this.getAllReposVaults()).keys()];
    }
    async pullVault(opts) {
        const { vault } = lodash_1.default.defaults(opts, {
            urlTransformer: lodash_1.default.identity,
        });
        const wsRoot = this.wsRoot;
        if (!vault.remote || vault.remote.type !== "git") {
            throw new common_all_1.DendronError({ message: "pulling non-git vault" });
        }
        const repoPath = (0, common_server_1.vault2Path)({ wsRoot, vault });
        this.logger.info({ msg: "pulling ", repoPath });
        const git = (0, common_server_1.simpleGit)({ baseDir: repoPath });
        await git.pull();
        return repoPath;
    }
    /** Returns the list of vaults that were attempted to be pulled, even if there was nothing to pull. */
    async pullVaults() {
        const ctx = "pullVaults";
        const allReposVaults = await this.getAllReposVaults();
        const out = await Promise.all(lodash_1.default.map([...allReposVaults.entries()], async (rootVaults) => {
            const [repo, vaults] = rootVaults;
            const makeResult = (status) => {
                return {
                    repo,
                    vaults,
                    status,
                };
            };
            const git = new git_1.Git({ localUrl: repo });
            // It's impossible to pull if there is no remote or upstream
            if (!(await git.hasRemote()))
                return makeResult(workspaceServiceInterface_1.SyncActionStatus.NO_REMOTE);
            // If there's a merge conflict, then we can't continue
            if (await git.hasMergeConflicts())
                return makeResult(workspaceServiceInterface_1.SyncActionStatus.MERGE_CONFLICT);
            // A rebase in progress means there's no upstream, so it needs to come first.
            if (await git.hasRebaseInProgress()) {
                return makeResult(workspaceServiceInterface_1.SyncActionStatus.REBASE_IN_PROGRESS);
            }
            if (lodash_1.default.isUndefined(await git.getUpstream()))
                return makeResult(workspaceServiceInterface_1.SyncActionStatus.NO_UPSTREAM);
            if (!(await git.hasAccessToRemote()))
                return makeResult(workspaceServiceInterface_1.SyncActionStatus.BAD_REMOTE);
            // If the vault was configured not to pull, then skip it
            if (!(await this.shouldVaultsSync("pull", rootVaults)))
                return makeResult(workspaceServiceInterface_1.SyncActionStatus.SKIP_CONFIG);
            // If there are tracked changes, we need to stash them to pull
            let stashed;
            if (await git.hasChanges({ untrackedFiles: "no" })) {
                try {
                    stashed = await git.stashCreate();
                    this.logger.info({ ctx, vaults, repo, stashed });
                    // this shouldn't fail, but for safety's sake
                    if (lodash_1.default.isEmpty(stashed) || !git.isValidStashCommit(stashed)) {
                        throw new common_all_1.DendronError({
                            message: "unable to stash changes",
                            payload: { stashed },
                        });
                    }
                    // stash create doesn't change the working directory, so we need to get rid of the tracked changes
                    await git.reset("hard");
                }
                catch (err) {
                    this.logger.error({
                        ctx: "pullVaults",
                        vaults,
                        repo,
                        err,
                        stashed,
                    });
                    return makeResult(workspaceServiceInterface_1.SyncActionStatus.CANT_STASH);
                }
            }
            try {
                await git.pull();
                if (stashed) {
                    const restored = await git.stashApplyCommit(stashed);
                    stashed = undefined;
                    if (!restored)
                        return makeResult(workspaceServiceInterface_1.SyncActionStatus.MERGE_CONFLICT_AFTER_RESTORE);
                }
                // pull went well, everything is in order. The finally block will restore any stashed changes.
                return makeResult(workspaceServiceInterface_1.SyncActionStatus.DONE);
            }
            catch (err) {
                // Failed to pull, let's see why:
                if ((await git.hasMergeConflicts()) ||
                    (await git.hasRebaseInProgress())) {
                    if (stashed) {
                        // There was a merge conflict during the pull, and we have stashed changes.
                        // We can't apply the stash in this state, so we'd lose the users changes.
                        // Abort the rebase.
                        await git.rebaseAbort();
                        return makeResult(workspaceServiceInterface_1.SyncActionStatus.MERGE_CONFLICT_LOSES_CHANGES);
                    }
                    else {
                        return makeResult(workspaceServiceInterface_1.SyncActionStatus.MERGE_CONFLICT_AFTER_PULL);
                    }
                }
                else {
                    const stderr = (err === null || err === void 0 ? void 0 : err.stderr) || "";
                    const vaultNames = vaults
                        .map((vault) => common_all_1.VaultUtils.getName(vault))
                        .join(",");
                    throw new common_all_1.DendronError({
                        message: `Failed to pull ${vaultNames}: ${stderr}`,
                        payload: {
                            err,
                            vaults,
                            repo,
                            stashed,
                        },
                    });
                }
            }
            finally {
                // Try to restore changes if we stashed them, even if there were errors. We don't want to lose the users changes.
                if (stashed) {
                    git.stashApplyCommit(stashed);
                }
            }
        }));
        return out;
    }
    /** Returns the list of vaults that were attempted to be pushed, even if there was nothing to push. */
    async pushVaults() {
        const allReposVaults = await this.getAllReposVaults();
        const out = await Promise.all(lodash_1.default.map([...allReposVaults.entries()], async (rootVaults) => {
            const [repo, vaults] = rootVaults;
            const git = new git_1.Git({ localUrl: repo });
            const makeResult = (status) => {
                return {
                    repo,
                    vaults,
                    status,
                };
            };
            if (!(await this.shouldVaultsSync("push", rootVaults)))
                return makeResult(workspaceServiceInterface_1.SyncActionStatus.SKIP_CONFIG);
            if (!(await git.hasRemote()))
                return { repo, vaults, status: workspaceServiceInterface_1.SyncActionStatus.NO_REMOTE };
            // if there's a rebase in progress then there's no upstream, so it needs to come first
            if (await git.hasMergeConflicts()) {
                return makeResult(workspaceServiceInterface_1.SyncActionStatus.MERGE_CONFLICT);
            }
            if (await git.hasRebaseInProgress()) {
                return makeResult(workspaceServiceInterface_1.SyncActionStatus.REBASE_IN_PROGRESS);
            }
            const upstream = await git.getUpstream();
            if (lodash_1.default.isUndefined(upstream))
                return makeResult(workspaceServiceInterface_1.SyncActionStatus.NO_UPSTREAM);
            if (!(await git.hasAccessToRemote()))
                return makeResult(workspaceServiceInterface_1.SyncActionStatus.BAD_REMOTE);
            if (!(await git.hasPushableChanges(upstream)))
                return makeResult(workspaceServiceInterface_1.SyncActionStatus.NO_CHANGES);
            if (!(await git.hasPushableRemote()))
                return makeResult(workspaceServiceInterface_1.SyncActionStatus.UNPULLED_CHANGES);
            if (!lodash_1.default.every(lodash_1.default.map(vaults, this.user.canPushVault)))
                return makeResult(workspaceServiceInterface_1.SyncActionStatus.NOT_PERMITTED);
            try {
                await git.push();
                return makeResult(workspaceServiceInterface_1.SyncActionStatus.DONE);
            }
            catch (err) {
                const stderr = err.stderr ? `: ${err.stderr}` : "";
                throw new common_all_1.DendronError({
                    message: `error pushing vault${stderr}`,
                    payload: { err, repoPath: repo },
                });
            }
        }));
        return out;
    }
    /**
     * Remove all vault caches in workspace
     */
    async removeVaultCaches() {
        const vaults = common_all_1.ConfigUtils.getVaults(this.config);
        await Promise.all(vaults.map((vault) => {
            return (0, utils_1.removeCache)((0, common_server_1.vault2Path)({ wsRoot: this.wsRoot, vault }));
        }));
    }
    /**
     * See if there's anythign we need to change with the configuration
     */
    async runMigrationsIfNecessary({ forceUpgrade, workspaceInstallStatus, currentVersion, previousVersion, dendronConfig, wsConfig, }) {
        let changes = [];
        if (migrations_1.MigrationService.shouldRunMigration({
            force: forceUpgrade,
            workspaceInstallStatus,
        })) {
            changes = await migrations_1.MigrationService.applyMigrationRules({
                currentVersion,
                previousVersion,
                dendronConfig,
                wsConfig,
                wsService: this,
                logger: this.logger,
            });
            // if changes were made, use updated changes in subsequent configuration
            if (!lodash_1.default.isEmpty(changes)) {
                const { data } = lodash_1.default.last(changes);
                dendronConfig = data.dendronConfig;
            }
        }
        return changes;
    }
    /**
     * Make sure all vaults are present on file system
     * @param fetchAndPull for repositories that exist, should we also do a fetch? default: false
     * @param skipPrivate skip cloning and pulling of private vaults. default: false
     */
    async syncVaults(opts) {
        const ctx = "syncVaults";
        const { config, progressIndicator, urlTransformer, fetchAndPull } = lodash_1.default.defaults(opts, { fetchAndPull: false, skipPrivate: false });
        const { wsRoot } = this;
        const workspaces = common_all_1.ConfigUtils.getWorkspace(config).workspaces;
        // check workspaces
        const workspacePaths = (await Promise.all(lodash_1.default.map(workspaces, async (wsEntry, wsName) => {
            const wsPath = path_1.default.join(wsRoot, wsName);
            if (!(await fs_extra_1.default.pathExists(wsPath))) {
                return {
                    wsPath: await this.cloneWorkspace({
                        wsName,
                        workspace: wsEntry,
                        wsRoot,
                    }),
                    wsUrl: wsEntry.remote.url,
                };
            }
            return;
        }))).filter((ent) => !lodash_1.default.isUndefined(ent));
        // const seedService = new SeedService({wsRoot});
        // check seeds
        const seeds = common_all_1.ConfigUtils.getWorkspace(config).seeds;
        const seedResults = [];
        await Promise.all(lodash_1.default.map(seeds, async (entry, id) => {
            if (!(await seed_1.SeedUtils.exists({ id, wsRoot }))) {
                const resp = await this._seedService.info({ id });
                if (lodash_1.default.isUndefined(resp)) {
                    seedResults.push({
                        id,
                        status: workspaceServiceInterface_1.SyncActionStatus.ERROR,
                        data: new common_all_1.DendronError({
                            status: workspaceServiceInterface_1.SyncActionStatus.ERROR,
                            message: `seed ${id} does not exist in registry`,
                        }),
                    });
                    return;
                }
                const spath = await this._seedService.cloneSeed({
                    seed: resp,
                    branch: entry.branch,
                });
                seedResults.push({
                    id,
                    status: workspaceServiceInterface_1.SyncActionStatus.NEW,
                    data: { spath },
                });
            }
            return undefined;
        }));
        // clone all missing vaults
        const vaults = common_all_1.ConfigUtils.getVaults(config);
        const emptyRemoteVaults = vaults.filter((vault) => !lodash_1.default.isUndefined(vault.remote) &&
            !fs_extra_1.default.existsSync(path_1.default.join(wsRoot, vault.fsPath)));
        const didClone = !lodash_1.default.isEmpty(emptyRemoteVaults) ||
            !lodash_1.default.isEmpty(workspacePaths) ||
            !lodash_1.default.isUndefined(seedResults.find((ent) => ent.status === workspaceServiceInterface_1.SyncActionStatus.NEW));
        // if we added a workspace, we also add new vaults
        if (!lodash_1.default.isEmpty(workspacePaths)) {
            await this.setConfig(config);
        }
        if (progressIndicator && didClone) {
            progressIndicator();
        }
        await Promise.all(emptyRemoteVaults.map(async (vault) => {
            return this.cloneVault({ vault, urlTransformer });
        }));
        if (fetchAndPull) {
            const vaults = common_all_1.ConfigUtils.getVaults(config);
            const vaultsToFetch = lodash_1.default.difference(vaults.filter((vault) => !lodash_1.default.isUndefined(vault.remote)), emptyRemoteVaults);
            this.logger.info({ ctx, msg: "fetching vaults", vaultsToFetch });
            await Promise.all(vaultsToFetch.map(async (vault) => {
                return this.pullVault({ vault });
            }));
        }
        return { didClone };
    }
    writePort(port) {
        const wsRoot = this.wsRoot;
        // dendron-cli can overwrite port file. anything that needs the port should connect to `portFilePathExtension`
        const portFilePath = utils_1.EngineUtils.getPortFilePathForWorkspace({ wsRoot });
        fs_extra_1.default.writeFileSync(portFilePath, lodash_1.default.toString(port), { encoding: "utf8" });
    }
    getMeta() {
        const fpath = (0, utils_1.getWSMetaFilePath)({ wsRoot: this.wsRoot });
        const meta = (0, utils_1.openWSMetaFile)({ fpath });
        return meta;
    }
    writeMeta(opts) {
        const { version } = opts;
        const fpath = (0, utils_1.getWSMetaFilePath)({ wsRoot: this.wsRoot });
        return (0, utils_1.writeWSMetaFile)({
            fpath,
            data: {
                version,
                activationTime: common_all_1.Time.now().toMillis(),
            },
        });
    }
}
exports.WorkspaceService = WorkspaceService;
//# sourceMappingURL=service.js.map