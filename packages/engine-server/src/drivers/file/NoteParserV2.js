"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoteParserV2 = void 0;
/* eslint-disable no-await-in-loop */
const common_all_1 = require("@dendronhq/common-all");
const common_server_1 = require("@dendronhq/common-server");
const fs_extra_1 = __importDefault(require("fs-extra"));
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
const utils_1 = require("../../utils");
/**
 * Get hierarchy of each file
 * @param fpaths
 * @returns
 */
function getFileMeta(fpaths) {
    const metaDict = {};
    lodash_1.default.forEach(fpaths, (fpath) => {
        const { name } = path_1.default.parse(fpath);
        const lvl = name.split(".").length;
        if (!lodash_1.default.has(metaDict, lvl)) {
            metaDict[lvl] = [];
        }
        metaDict[lvl].push({ fpath });
    });
    return metaDict;
}
class NoteParserV2 {
    constructor(opts) {
        this.opts = opts;
        this.cache = opts.cache;
        this.engine = opts.engine;
    }
    get logger() {
        return this.opts.logger;
    }
    /**
     * Construct in-memory
     *
     * @param allPaths
     * @param vault
     * @returns
     */
    async parseFiles(allPaths, vault, schemas) {
        const ctx = "parseFiles";
        const fileMetaDict = getFileMeta(allPaths);
        const maxLvl = lodash_1.default.max(lodash_1.default.keys(fileMetaDict).map((e) => lodash_1.default.toInteger(e))) || 2;
        // In-memory representation of NoteProps dictionary
        const notesByFname = {};
        const notesById = {};
        const noteDicts = {
            notesById,
            notesByFname,
        };
        this.logger.info({ ctx, msg: "enter", vault });
        // Keep track of which notes in cache no longer exist
        const unseenKeys = this.cache.getCacheEntryKeys();
        const config = common_server_1.DConfig.readConfigSync(this.engine.wsRoot);
        const errors = [];
        // get root note
        if (lodash_1.default.isUndefined(fileMetaDict[1])) {
            return {
                noteDicts,
                errors: [
                    common_all_1.DendronError.createFromStatus({
                        status: common_all_1.ERROR_STATUS.NO_ROOT_NOTE_FOUND,
                    }),
                ],
            };
        }
        const rootFile = fileMetaDict[1].find((n) => n.fpath === "root.md");
        if (!rootFile) {
            return {
                noteDicts,
                errors: [
                    common_all_1.DendronError.createFromStatus({
                        status: common_all_1.ERROR_STATUS.NO_ROOT_NOTE_FOUND,
                    }),
                ],
            };
        }
        const rootProps = await this.parseNoteProps({
            fpath: rootFile.fpath,
            addParent: false,
            vault,
            config,
        });
        if (rootProps.error) {
            errors.push(rootProps.error);
        }
        if (!rootProps.data || rootProps.data.length === 0) {
            return {
                noteDicts,
                errors: [
                    common_all_1.DendronError.createFromStatus({
                        status: common_all_1.ERROR_STATUS.NO_ROOT_NOTE_FOUND,
                    }),
                ],
            };
        }
        const rootNote = rootProps.data[0].note;
        common_all_1.NoteDictsUtils.add(rootNote, noteDicts);
        unseenKeys.delete(rootNote.fname);
        this.logger.info({ ctx, msg: "post:parseRootNote" });
        // Parse root hierarchies
        await (0, common_all_1.asyncLoopOneAtATime)(fileMetaDict[1]
            // Don't count root node
            .filter((n) => n.fpath !== "root.md"), async (ent) => {
            try {
                const resp = await this.parseNoteProps({
                    fpath: ent.fpath,
                    addParent: false,
                    vault,
                    config,
                });
                // Store each successfully parsed node in note dict and keep track of errors
                if (resp.error) {
                    errors.push(resp.error);
                }
                if (resp.data && resp.data.length > 0) {
                    const parsedNote = resp.data[0].note;
                    unseenKeys.delete(parsedNote.fname);
                    common_all_1.DNodeUtils.addChild(rootNote, parsedNote);
                    // Check for duplicate IDs when adding notes to the map
                    if (notesById[parsedNote.id] !== undefined) {
                        const duplicate = notesById[parsedNote.id];
                        errors.push(new common_all_1.DuplicateNoteError({
                            noteA: duplicate,
                            noteB: parsedNote,
                        }));
                    }
                    // Update in-memory note dict
                    common_all_1.NoteDictsUtils.add(parsedNote, noteDicts);
                }
            }
            catch (err) {
                const error = common_all_1.ErrorFactory.wrapIfNeeded(err);
                // A fatal error would kill the initialization
                error.severity = common_all_1.ERROR_SEVERITY.MINOR;
                error.message =
                    `Failed to read ${ent.fpath} in ${vault.fsPath}: ` + error.message;
                errors.push(error);
            }
        });
        this.logger.info({ ctx, msg: "post:parseDomainNotes" });
        // Parse level by level
        let lvl = 2;
        while (lvl <= maxLvl) {
            await (0, common_all_1.asyncLoopOneAtATime)((fileMetaDict[lvl] || []).filter((ent) => {
                return !(0, common_all_1.globMatch)(["root.*"], ent.fpath);
            }), async (ent) => {
                try {
                    const resp = await this.parseNoteProps({
                        fpath: ent.fpath,
                        noteDicts: { notesById, notesByFname },
                        addParent: true,
                        vault,
                        config,
                    });
                    if (resp.error) {
                        errors.push(resp.error);
                    }
                    if (resp.data && resp.data.length > 0) {
                        const parsedNote = resp.data[0].note;
                        unseenKeys.delete(parsedNote.fname);
                        resp.data.forEach((ent) => {
                            const note = ent.note;
                            // Check for duplicate IDs when adding created notes to the map
                            if (ent.status === "create" &&
                                notesById[note.id] !== undefined) {
                                const duplicate = notesById[note.id];
                                errors.push(new common_all_1.DuplicateNoteError({
                                    noteA: duplicate,
                                    noteB: note,
                                }));
                            }
                            common_all_1.NoteDictsUtils.add(note, noteDicts);
                        });
                    }
                }
                catch (err) {
                    const dendronError = common_all_1.ErrorFactory.wrapIfNeeded(err);
                    // A fatal error would kill the initialization
                    dendronError.severity = common_all_1.ERROR_SEVERITY.MINOR;
                    dendronError.message =
                        `Failed to read ${ent.fpath} in ${vault.fsPath}: ` +
                            dendronError.message;
                    errors.push(dendronError);
                }
            });
            lvl += 1;
        }
        this.logger.info({ ctx, msg: "post:parseAllNotes" });
        // Add schemas
        const domains = notesById[rootNote.id].children.map((ent) => notesById[ent]);
        domains.map((domain) => {
            common_all_1.SchemaUtils.matchDomain(domain, notesById, schemas);
        });
        // Remove stale entries from cache
        unseenKeys.forEach((unseenKey) => {
            this.cache.drop(unseenKey);
        });
        // OPT:make async and don't wait for return
        // Skip this if we found no notes, which means vault did not initialize, or if there are no cache changes needed
        if ((lodash_1.default.size(notesById) > 0 && this.cache.numCacheMisses > 0) ||
            unseenKeys.size > 0) {
            this.cache.writeToFileSystem();
        }
        this.logger.info({ ctx, msg: "post:matchSchemas" });
        return {
            noteDicts,
            errors,
        };
    }
    /**
     * Given a fpath, convert to NoteProp
     * Update parent/children metadata if parents = true
     *
     * @returns List of all notes changed. If a note has no direct parents, stub notes are added instead
     */
    async parseNoteProps(opts) {
        const cleanOpts = lodash_1.default.defaults(opts, {
            addParent: true,
            noteDicts: {
                notesById: {},
                notesByFname: {},
            },
        });
        const { fpath, noteDicts, vault, config } = cleanOpts;
        const ctx = "parseNoteProps";
        this.logger.debug({ ctx, msg: "enter", fpath });
        const wsRoot = this.engine.wsRoot;
        const vpath = (0, common_server_1.vault2Path)({ vault, wsRoot });
        let changeEntries = [];
        try {
            // Get note props from file and propagate any errors
            const { data: note, error } = await this.file2NoteWithCache({
                fpath: path_1.default.join(vpath, fpath),
                vault,
                config,
            });
            if (note) {
                changeEntries.push({ status: "create", note });
                // Add parent/children properties
                if (cleanOpts.addParent) {
                    const changed = common_all_1.NoteUtils.addOrUpdateParents({
                        note,
                        noteDicts,
                        createStubs: true,
                    });
                    changeEntries = changeEntries.concat(changed);
                }
            }
            return { data: changeEntries, error };
        }
        catch (_err) {
            if (!common_all_1.ErrorUtils.isDendronError(_err)) {
                const error = common_all_1.DendronError.createFromStatus({
                    status: common_all_1.ERROR_STATUS.BAD_PARSE_FOR_NOTE,
                    severity: common_all_1.ERROR_SEVERITY.MINOR,
                    payload: { fname: fpath, error: (0, common_all_1.stringifyError)(_err) },
                    message: `${fpath} could not be parsed`,
                });
                this.logger.error({ ctx, error });
                return { error };
            }
            return { error: _err };
        }
    }
    /**
     * Given a fpath, attempt to convert raw file contents into a NoteProp
     *
     * Look up metadata from cache. If contenthash hasn't changed, use metadata from cache.
     * Otherwise, reconstruct metadata from scratch
     *
     * @returns NoteProp associated with fpath
     */
    async file2NoteWithCache({ fpath, vault, config, }) {
        const content = fs_extra_1.default.readFileSync(fpath, { encoding: "utf8" });
        const { name } = path_1.default.parse(fpath);
        const sig = (0, common_all_1.genHash)(content);
        const cacheEntry = this.cache.get(name);
        const matchHash = (cacheEntry === null || cacheEntry === void 0 ? void 0 : cacheEntry.hash) === sig;
        let note;
        // if hash matches, note hasn't changed
        if (matchHash) {
            // since we don't store the note body in the cache file, we need to re-parse the body
            const capture = content.match(/^---[\s\S]+?---/);
            if (capture) {
                const offset = capture[0].length;
                const body = content.slice(offset + 1);
                // vault can change without note changing so we need to add this
                // add `contentHash` to this signature because its not saved with note
                note = {
                    ...cacheEntry.data,
                    body,
                    vault,
                    contentHash: sig,
                };
                return { data: note, error: null };
            }
            else {
                // No frontmatter exists for this file, return error
                return {
                    error: new common_all_1.DendronError({
                        message: `File "${fpath}" is missing frontmatter.`,
                        severity: common_all_1.ERROR_SEVERITY.MINOR,
                    }),
                };
            }
        }
        // If hash is different, then we update all links and anchors ^link-anchor
        note = (0, common_all_1.string2Note)({ content, fname: name, vault });
        note.contentHash = sig;
        // Link/anchor errors should be logged but not interfere with rest of parsing
        let error = null;
        try {
            await utils_1.EngineUtils.refreshNoteLinksAndAnchors({
                note,
                engine: this.engine,
                config,
            });
        }
        catch (_err) {
            error = common_all_1.ErrorFactory.wrapIfNeeded(_err);
        }
        // Update cache entry as well
        this.cache.set(name, (0, utils_1.createCacheEntry)({
            noteProps: note,
            hash: note.contentHash,
        }));
        this.cache.incrementCacheMiss();
        return { data: note, error };
    }
}
exports.NoteParserV2 = NoteParserV2;
//# sourceMappingURL=NoteParserV2.js.map