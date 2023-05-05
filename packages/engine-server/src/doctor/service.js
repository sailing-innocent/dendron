"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DoctorService = exports.DoctorActionsEnum = void 0;
const common_all_1 = require("@dendronhq/common-all");
const common_server_1 = require("@dendronhq/common-server");
const async_throttle_1 = __importDefault(require("@jcoreio/async-throttle"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
const __1 = require("..");
const unified_1 = require("@dendronhq/unified");
var DoctorActionsEnum;
(function (DoctorActionsEnum) {
    DoctorActionsEnum["FIX_FRONTMATTER"] = "fixFrontmatter";
    DoctorActionsEnum["H1_TO_TITLE"] = "h1ToTitle";
    DoctorActionsEnum["HI_TO_H2"] = "h1ToH2";
    DoctorActionsEnum["REMOVE_STUBS"] = "removeStubs";
    DoctorActionsEnum["CREATE_MISSING_LINKED_NOTES"] = "createMissingLinkedNotes";
    DoctorActionsEnum["REGENERATE_NOTE_ID"] = "regenerateNoteId";
    DoctorActionsEnum["FIND_BROKEN_LINKS"] = "findBrokenLinks";
    DoctorActionsEnum["FIX_REMOTE_VAULTS"] = "fixRemoteVaults";
    DoctorActionsEnum["FIX_AIRTABLE_METADATA"] = "fixAirtableMetadata";
    DoctorActionsEnum["ADD_MISSING_DEFAULT_CONFIGS"] = "addMissingDefaultConfigs";
    DoctorActionsEnum["REMOVE_DEPRECATED_CONFIGS"] = "removeDeprecatedConfigs";
    DoctorActionsEnum["FIX_SELF_CONTAINED_VAULT_CONFIG"] = "fixSelfContainedVaultsInConfig";
    DoctorActionsEnum["FIX_INVALID_FILENAMES"] = "fixInvalidFileNames";
})(DoctorActionsEnum = exports.DoctorActionsEnum || (exports.DoctorActionsEnum = {}));
/** DoctorService is a disposable, you **must** dispose instances you create
 * otherwise you risk leaking file descriptors which may lead to crashes. */
class DoctorService {
    constructor(opts) {
        const { logger, dispose } = (0, common_server_1.createDisposableLogger)("DoctorService");
        this.L = logger;
        this.loggerDispose = dispose;
        // if given a print function, use that.
        // otherwise, no-op
        this.print = (opts === null || opts === void 0 ? void 0 : opts.printFunc) ? opts.printFunc : () => { };
    }
    dispose() {
        this.loggerDispose();
    }
    findBrokenLinks(note, noteDicts, engine) {
        const { vaults } = engine;
        const links = note.links;
        if (lodash_1.default.isEmpty(links)) {
            return [];
        }
        const out = lodash_1.default.filter(links, (link) => {
            if (link.type !== "wiki") {
                return false;
            }
            const hasVaultPrefix = unified_1.LinkUtils.hasVaultPrefix(link);
            let vault;
            if (hasVaultPrefix) {
                vault = common_all_1.VaultUtils.getVaultByName({
                    vaults,
                    vname: link.to.vaultName,
                });
                if (!vault)
                    return false;
            }
            const isMultiVault = vaults.length > 1;
            const noteExists = common_all_1.NoteDictsUtils.findByFname({
                fname: link.to.fname,
                noteDicts,
                vault: hasVaultPrefix ? vault : note.vault,
            })[0];
            if (hasVaultPrefix) {
                // true: link w/ vault prefix that points to nothing. (candidate for sure)
                // false: link w/ vault prefix that points to a note. (valid link)
                return !noteExists;
            }
            if (!noteExists) {
                // true: no vault prefix and single vault. (candidate for sure)
                // false: no vault prefix and multi vault. (ambiguous)
                return !isMultiVault;
            }
            // (valid link)
            return false;
        });
        return out;
    }
    getBrokenLinkDestinations(notes, engine) {
        const { vaults } = engine;
        let brokenWikiLinks = [];
        const noteDicts = common_all_1.NoteDictsUtils.createNoteDicts(notes);
        lodash_1.default.forEach(notes, (note) => {
            const links = note.links;
            if (lodash_1.default.isEmpty(links)) {
                return;
            }
            const brokenLinks = this.findBrokenLinks(note, noteDicts, engine);
            brokenWikiLinks = brokenWikiLinks.concat(brokenLinks);
            return true;
        });
        const uniqueCandidates = lodash_1.default.map(lodash_1.default.uniqBy(brokenWikiLinks, "to.fname"), (link) => {
            var _a;
            const destVault = ((_a = link.to) === null || _a === void 0 ? void 0 : _a.vaultName)
                ? common_all_1.VaultUtils.getVaultByName({ vaults, vname: link.to.vaultName })
                : common_all_1.VaultUtils.getVaultByName({ vaults, vname: link.from.vaultName });
            return common_all_1.NoteUtils.create({
                fname: link.to.fname,
                vault: destVault,
            });
        });
        return uniqueCandidates;
    }
    async findMisconfiguredSelfContainedVaults(wsRoot, vaults) {
        return (await Promise.all(vaults.map(async (vault) => {
            if (vault.selfContained || vault.workspace || vault.seed)
                return;
            if (await (0, common_server_1.isSelfContainedVaultFolder)(path_1.default.join(wsRoot, vault.fsPath))) {
                return vault;
            }
            return;
        }))).filter(common_all_1.isNotUndefined);
    }
    async executeDoctorActions(opts) {
        var _a;
        const { action, engine, query, candidates, limit, dryRun, exit, podId, hierarchy, vault, } = lodash_1.default.defaults(opts, {
            limit: 99999,
            exit: true,
        });
        let notes;
        if (lodash_1.default.isUndefined(candidates)) {
            notes =
                (_a = (query
                    ? await engine.queryNotes({ qs: query, originalQS: query })
                    : await engine.findNotes({ excludeStub: true }))) !== null && _a !== void 0 ? _a : [];
        }
        else {
            notes = candidates;
        }
        if (notes) {
            notes = notes.filter((n) => !n.stub);
        }
        const noteDicts = common_all_1.NoteDictsUtils.createNoteDicts(notes);
        // this.L.info({ msg: "prep doctor", numResults: notes.length });
        let numChanges = 0;
        let resp;
        const engineWrite = dryRun
            ? () => { }
            : (0, async_throttle_1.default)(lodash_1.default.bind(engine.writeNote, engine), 300, {
                // @ts-ignore
                leading: true,
            });
        const engineDelete = dryRun
            ? () => { }
            : (0, async_throttle_1.default)(lodash_1.default.bind(engine.deleteNote, engine), 300, {
                // @ts-ignore
                leading: true,
            });
        let doctorAction;
        switch (action) {
            case DoctorActionsEnum.REMOVE_DEPRECATED_CONFIGS: {
                const { wsRoot } = engine;
                const rawConfig = common_server_1.DConfig.getRaw(wsRoot);
                const config = common_server_1.DConfig.readConfigSync(wsRoot);
                const pathsToDelete = common_all_1.ConfigUtils.detectDeprecatedConfigs({
                    config: rawConfig,
                    deprecatedPaths: __1.DEPRECATED_PATHS,
                });
                if (pathsToDelete.length > 0) {
                    const backupPath = await this.createBackup(wsRoot, DoctorActionsEnum.REMOVE_DEPRECATED_CONFIGS);
                    if (backupPath instanceof common_all_1.DendronError) {
                        return {
                            exit: true,
                            error: backupPath,
                        };
                    }
                    const configDeepCopy = lodash_1.default.cloneDeep(config);
                    pathsToDelete.forEach((path) => {
                        lodash_1.default.unset(configDeepCopy, path);
                    });
                    await common_server_1.DConfig.writeConfig({ wsRoot, config: configDeepCopy });
                    return {
                        exit: true,
                        resp: {
                            backupPath,
                        },
                    };
                }
                return { exit: true };
            }
            case DoctorActionsEnum.ADD_MISSING_DEFAULT_CONFIGS: {
                const { wsRoot } = engine;
                const rawConfig = common_server_1.DConfig.getRaw(wsRoot);
                const detectOut = common_all_1.ConfigUtils.detectMissingDefaults({
                    config: rawConfig,
                });
                if (detectOut) {
                    const { needsBackfill, backfilledConfig } = detectOut;
                    if (needsBackfill) {
                        // back up dendron.yml first
                        const backupPath = await this.createBackup(wsRoot, DoctorActionsEnum.ADD_MISSING_DEFAULT_CONFIGS);
                        if (backupPath instanceof common_all_1.DendronError) {
                            return {
                                exit: true,
                                error: backupPath,
                            };
                        }
                        // write config
                        await common_server_1.DConfig.writeConfig({ wsRoot, config: backfilledConfig });
                        return {
                            exit: true,
                            resp: {
                                backupPath,
                            },
                        };
                    }
                }
                return { exit: true };
            }
            case DoctorActionsEnum.FIX_FRONTMATTER: {
                this.print("the CLI currently doesn't support this action. please run this using the plugin");
                return { exit };
            }
            // eslint-disable-next-line no-fallthrough
            case DoctorActionsEnum.H1_TO_TITLE: {
                doctorAction = async (note) => {
                    const changes = [];
                    const proc = unified_1.MDUtilsV5._procRemark({
                        mode: unified_1.ProcMode.IMPORT,
                        flavor: common_all_1.ProcFlavor.REGULAR,
                    }, {
                        dest: unified_1.DendronASTDest.MD_DENDRON,
                        noteToRender: note,
                        fname: note.fname,
                        vault: note.vault,
                        config: common_server_1.DConfig.readConfigSync(engine.wsRoot),
                    });
                    const newBody = await proc()
                        .use(unified_1.RemarkUtils.h1ToTitle(note, changes))
                        .process(note.body);
                    note.body = newBody.toString();
                    if (!lodash_1.default.isEmpty(changes)) {
                        await engineWrite(note);
                        this.L.info({ msg: `changes ${note.fname}`, changes });
                        numChanges += 1;
                        return;
                    }
                    else {
                        return;
                    }
                };
                break;
            }
            case DoctorActionsEnum.HI_TO_H2: {
                doctorAction = async (note) => {
                    const changes = [];
                    const proc = unified_1.MDUtilsV5._procRemark({
                        mode: unified_1.ProcMode.IMPORT,
                        flavor: common_all_1.ProcFlavor.REGULAR,
                    }, {
                        dest: unified_1.DendronASTDest.MD_DENDRON,
                        noteToRender: note,
                        fname: note.fname,
                        vault: note.vault,
                        config: common_server_1.DConfig.readConfigSync(engine.wsRoot),
                    });
                    const newBody = await proc()
                        .use(unified_1.RemarkUtils.h1ToH2(note, changes))
                        .process(note.body);
                    note.body = newBody.toString();
                    if (!lodash_1.default.isEmpty(changes)) {
                        await engineWrite(note);
                        this.L.info({ msg: `changes ${note.fname}`, changes });
                        numChanges += 1;
                        return;
                    }
                    else {
                        return;
                    }
                };
                break;
            }
            case DoctorActionsEnum.REMOVE_STUBS: {
                doctorAction = async (note) => {
                    const changes = [];
                    if (lodash_1.default.trim(note.body) === "") {
                        changes.push({
                            status: "delete",
                            note,
                        });
                    }
                    if (!lodash_1.default.isEmpty(changes)) {
                        await engineDelete(note.id);
                        const vname = common_all_1.VaultUtils.getName(note.vault);
                        this.L.info(`doctor ${DoctorActionsEnum.REMOVE_STUBS} ${note.fname} ${vname}`);
                        numChanges += 1;
                        return;
                    }
                    else {
                        return;
                    }
                };
                break;
            }
            case DoctorActionsEnum.CREATE_MISSING_LINKED_NOTES: {
                notes = this.getBrokenLinkDestinations(notes, engine);
                doctorAction = async (note) => {
                    await engineWrite(note);
                    numChanges += 1;
                };
                break;
            }
            case DoctorActionsEnum.REGENERATE_NOTE_ID: {
                doctorAction = async (note) => {
                    if (note.id === "root")
                        return; // Root notes are special, preserve them
                    note.id = (0, common_all_1.genUUID)();
                    await engine.writeNote(note, {
                        runHooks: false,
                        overrideExisting: true,
                    });
                    numChanges += 1;
                };
                break;
            }
            case DoctorActionsEnum.FIND_BROKEN_LINKS: {
                resp = [];
                doctorAction = async (note) => {
                    const brokenLinks = this.findBrokenLinks(note, noteDicts, engine);
                    if (brokenLinks.length > 0) {
                        resp.push({
                            file: note.fname,
                            vault: common_all_1.VaultUtils.getName(note.vault),
                            links: brokenLinks.map((link) => {
                                var _a, _b;
                                return {
                                    value: link.value,
                                    line: (_a = link.position) === null || _a === void 0 ? void 0 : _a.start.line,
                                    column: (_b = link.position) === null || _b === void 0 ? void 0 : _b.start.column,
                                };
                            }),
                        });
                        return brokenLinks;
                    }
                    else {
                        return;
                    }
                };
                break;
            }
            case DoctorActionsEnum.FIX_REMOTE_VAULTS: {
                /** Convert a local vault to a remote vault if it is in a git repository and has a remote set. */
                // This action deliberately doesn't set `doctorAction` since it doesn't run per note
                const { wsRoot, vaults } = engine;
                const ctx = "ReloadIndex.convertToRemoteVaultIfPossible";
                const vaultsToFix = (await Promise.all(vaults.map(async (vault) => {
                    const vaultDir = (0, common_server_1.pathForVaultRoot)({ wsRoot, vault });
                    const gitPath = path_1.default.join(vaultDir, ".git");
                    // Already a remote vault
                    if (vault.remote !== undefined)
                        return;
                    // Not a git repository, nothing to convert
                    if (!(await fs_extra_1.default.pathExists(gitPath)))
                        return;
                    const git = new __1.Git({ localUrl: vaultDir });
                    const remoteUrl = await git.getRemoteUrl();
                    // We can't convert if there is no remote
                    if (!remoteUrl)
                        return;
                    return { vault, remoteUrl };
                }))).filter(common_all_1.isNotUndefined);
                if (vaultsToFix.length > 0) {
                    const out = await this.createBackup(wsRoot, DoctorActionsEnum.FIX_SELF_CONTAINED_VAULT_CONFIG);
                    if (out instanceof common_all_1.DendronError) {
                        return {
                            exit: true,
                            error: out,
                        };
                    }
                    const workspaceService = new __1.WorkspaceService({ wsRoot });
                    await (0, common_all_1.asyncLoopOneAtATime)(vaultsToFix, async ({ vault, remoteUrl }) => {
                        const vaultDir = (0, common_server_1.pathForVaultRoot)({ wsRoot, vault });
                        this.L.info({
                            ctx,
                            vaultDir,
                            remoteUrl,
                            msg: "converting local vault to a remote vault",
                        });
                        await workspaceService.markVaultAsRemoteInConfig(vault, remoteUrl);
                    });
                }
                return { exit: true };
            }
            case DoctorActionsEnum.FIX_SELF_CONTAINED_VAULT_CONFIG: {
                /** If a self contained vault was not marked as self contained in the settings, mark it as such. */
                // This action deliberately doesn't set `doctorAction` since it doesn't run per note
                const { wsRoot, vaults } = engine;
                const ctx = "DoctorService.fixSelfContainedVaultConfig";
                const workspaceService = new __1.WorkspaceService({ wsRoot });
                const vaultsToFix = await this.findMisconfiguredSelfContainedVaults(wsRoot, vaults);
                this.L.info({
                    ctx,
                    msg: `Found ${vaultsToFix.length} vaults to fix`,
                    numVaultsToFix: vaultsToFix.length,
                });
                if (vaultsToFix.length > 0) {
                    // We'll be modifying the config so take a backup first
                    const out = await this.createBackup(wsRoot, DoctorActionsEnum.FIX_SELF_CONTAINED_VAULT_CONFIG);
                    if (out instanceof common_all_1.DendronError) {
                        return {
                            exit: true,
                            error: out,
                        };
                    }
                    await (0, common_all_1.asyncLoopOneAtATime)(vaultsToFix, async (vault) => {
                        const config = workspaceService.config;
                        this.L.info({
                            ctx,
                            vaultName: common_all_1.VaultUtils.getName(vault),
                            msg: "marking vault as self contained vault",
                        });
                        common_all_1.ConfigUtils.updateVault(config, vault, (vault) => {
                            vault.selfContained = true;
                            return vault;
                        });
                        await workspaceService.setConfig(config);
                    });
                }
                workspaceService.dispose();
                return { exit: true };
            }
            case DoctorActionsEnum.FIX_AIRTABLE_METADATA: {
                // Converts the airtable id in note frontmatter from a single scalar value to a hashmap
                if (!podId) {
                    (0, common_all_1.assertInvalidState)("Please provide the pod Id that was used to export the note(s).");
                }
                // we get vault name(string) as parameter from cli and vault(DVault) from plugin
                const selectedVault = lodash_1.default.isString(vault)
                    ? common_all_1.VaultUtils.getVaultByName({ vaults: engine.vaults, vname: vault })
                    : vault;
                const selectedHierarchy = lodash_1.default.isUndefined(query) ? hierarchy : query;
                // Plugin already checks for selected hierarchy. This check is useful when fixAirtableMetadata action is ran from cli
                if (!selectedHierarchy || !selectedVault) {
                    (0, common_all_1.assertInvalidState)("Please provide the hierarchy(with --query arg) and vault(--vault) of notes you would like to update with new Airtable Metadata");
                }
                //finding candidate notes
                notes = notes.filter((value) => value.fname.startsWith(selectedHierarchy) &&
                    value.stub !== true &&
                    common_all_1.VaultUtils.isEqualV2(value.vault, selectedVault) &&
                    value.custom.airtableId);
                this.L.info({
                    msg: `${DoctorActionsEnum.FIX_FRONTMATTER} ${notes.length} Notes will be Affected`,
                });
                doctorAction = async (note) => {
                    //get airtable id from note
                    const airtableId = lodash_1.default.get(note.custom, "airtableId");
                    const pods = {
                        airtable: {
                            [podId]: airtableId,
                        },
                    };
                    delete note.custom["airtableId"];
                    const updatedNote = {
                        ...note,
                        custom: { ...note.custom, pods },
                    };
                    // update note
                    await engine.writeNote(updatedNote);
                };
                break;
            }
            case DoctorActionsEnum.FIX_INVALID_FILENAMES: {
                const { canRename, cantRename, stats } = this.findInvalidFileNames({
                    notes,
                    noteDicts,
                });
                resp = stats;
                if (canRename.length > 0) {
                    this.print("Found invalid filename in notes:\n");
                    canRename.forEach((item) => {
                        const { note, resp, cleanedFname } = item;
                        const { fname, vault } = note;
                        const vaultName = common_all_1.VaultUtils.getName(vault);
                        this.print(`Note "${fname}" in ${vaultName} (reason: ${resp.reason})`);
                        this.print(`  Can be automatically fixed to "${cleanedFname}"`);
                    });
                }
                let changes = [];
                if (!dryRun) {
                    changes = await this.fixInvalidFileNames({
                        canRename,
                        engine,
                    });
                }
                if (cantRename.length > 0) {
                    this.print("These notes' filenames cannot be automatically fixed because it will result in duplicate notes:");
                    cantRename.forEach((item) => {
                        const { note, resp, cleanedFname } = item;
                        const { fname, vault } = note;
                        const vaultName = common_all_1.VaultUtils.getName(vault);
                        this.print(`Note "${fname}" in ${vaultName} (reason: ${resp.reason})`);
                        this.print(`  Note "${cleanedFname}" already exists.`);
                    });
                }
                const changeCounts = (0, common_all_1.extractNoteChangeEntryCounts)(changes);
                resp = {
                    ...resp,
                    ...changeCounts,
                };
                break;
            }
            default:
                throw new common_all_1.DendronError({
                    message: "Unexpected Doctor action. If this is something Dendron should support, please create an issue on our Github repository.",
                });
        }
        if (doctorAction !== undefined) {
            for (const note of notes) {
                if (numChanges >= limit)
                    break;
                this.L.debug({ msg: `processing ${note.fname}` });
                // eslint-disable-next-line no-await-in-loop
                await doctorAction(note);
            }
        }
        this.L.info({ msg: "doctor done", numChanges });
        if (action === DoctorActionsEnum.FIND_BROKEN_LINKS) {
            this.print(JSON.stringify({ brokenLinks: resp }, null, "  "));
        }
        return { exit, resp };
    }
    /** Returns the path for the backup if it was able to create one, or a DendronError if one occurred during backup. */
    async createBackup(wsRoot, backupInfix) {
        try {
            const path = await common_server_1.DConfig.createBackup(wsRoot, backupInfix);
            return path;
        }
        catch (error) {
            return new common_all_1.DendronError({
                message: `Backup ${backupInfix} failed. Aborting the Doctor action.`,
                payload: error,
            });
        }
    }
    findInvalidFileNames(opts) {
        const { notes, noteDicts } = opts;
        const validationResps = notes
            // stubs will be automatically handled when their children are renamed
            .filter((note) => {
            return !note.stub;
        })
            .map((note) => {
            const { fname } = note;
            const resp = common_all_1.NoteUtils.validateFname(fname);
            return {
                note,
                resp,
            };
        });
        const invalidResps = validationResps.filter((validationResp) => !validationResp.resp.isValid);
        const stats = {
            numEmptyHierarchy: invalidResps.filter((item) => item.resp.reason === common_all_1.InvalidFilenameReason.EMPTY_HIERARCHY).length,
            numIllegalCharacter: invalidResps.filter((item) => item.resp.reason === common_all_1.InvalidFilenameReason.ILLEGAL_CHARACTER).length,
            numLeadingOrTrailingWhitespace: invalidResps.filter((item) => item.resp.reason ===
                common_all_1.InvalidFilenameReason.LEADING_OR_TRAILING_WHITESPACE).length,
        };
        const [canRename, cantRename] = lodash_1.default.partition(invalidResps.map((item) => {
            const { note } = item;
            const { fname } = note;
            const cleanedFname = common_all_1.NoteUtils.cleanFname({
                fname,
            });
            const canRename = common_all_1.NoteDictsUtils.findByFname({
                fname: cleanedFname,
                noteDicts,
                vault: note.vault,
            }).length === 0;
            return {
                ...item,
                cleanedFname,
                canRename,
            };
        }), (item) => item.canRename);
        return {
            canRename,
            cantRename,
            stats,
        };
    }
    async fixInvalidFileNames(opts) {
        const { canRename, engine } = opts;
        let changes = [];
        if (canRename.length > 0) {
            await (0, common_all_1.asyncLoopOneAtATime)(canRename, async (item) => {
                const { note, cleanedFname } = item;
                const { fname, vault } = note;
                const vaultName = common_all_1.VaultUtils.getName(vault);
                const out = await engine.renameNote({
                    oldLoc: {
                        fname,
                        vaultName,
                    },
                    newLoc: {
                        fname: cleanedFname,
                        vaultName,
                    },
                });
                if (out.data) {
                    changes = changes.concat(out.data);
                    this.print(`Note "${fname}" in ${vaultName} renamed to "${cleanedFname}"`);
                }
                if (out.error) {
                    this.print(`Error encountered while renaming "${fname}" in vault ${vaultName}. The filename of this note is still invalid. Please manually rename this note.`);
                }
            });
            this.print("\n");
        }
        return changes;
    }
}
exports.DoctorService = DoctorService;
//# sourceMappingURL=service.js.map