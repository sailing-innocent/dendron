"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoteParser = void 0;
/* eslint-disable no-await-in-loop */
const common_all_1 = require("@dendronhq/common-all");
const common_server_1 = require("@dendronhq/common-server");
const fs_extra_1 = __importDefault(require("fs-extra"));
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
const utils_1 = require("../../utils");
const parseBase_1 = require("./parseBase");
const SQLiteMetadataStore_1 = require("../SQLiteMetadataStore");
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
        metaDict[lvl].push({ prefix: name, fpath });
    });
    return metaDict;
}
class NoteParser extends parseBase_1.ParserBase {
    constructor(opts) {
        super(opts);
        this.opts = opts;
        this.cache = opts.cache;
        this.engine = opts.engine;
    }
    async parseFiles(allPaths, vault, schemas, opts) {
        const ctx = "parseFile";
        const fileMetaDict = getFileMeta(allPaths);
        const maxLvl = lodash_1.default.max(lodash_1.default.keys(fileMetaDict).map((e) => lodash_1.default.toInteger(e))) || 2;
        const notesByFname = {};
        const notesById = {};
        const noteDicts = {
            notesById,
            notesByFname,
        };
        const wsRoot = this.engine.wsRoot;
        this.logger.info({ ctx, msg: "enter", vault });
        const cacheUpdates = {};
        // Keep track of which notes in cache no longer exist
        const unseenKeys = this.cache.getCacheEntryKeys();
        const errors = [];
        const config = common_server_1.DConfig.readConfigSync(wsRoot);
        // get root note
        if (lodash_1.default.isUndefined(fileMetaDict[1])) {
            throw common_all_1.DendronError.createFromStatus({
                status: common_all_1.ERROR_STATUS.NO_ROOT_NOTE_FOUND,
            });
        }
        const rootFile = fileMetaDict[1].find((n) => n.fpath === "root.md");
        if (!rootFile) {
            throw common_all_1.DendronError.createFromStatus({
                status: common_all_1.ERROR_STATUS.NO_ROOT_NOTE_FOUND,
            });
        }
        const rootProps = await this.parseNoteProps({
            fileMeta: rootFile,
            addParent: false,
            vault,
            config,
            errors,
        });
        const rootNote = rootProps.changeEntries[0].note;
        this.logger.info({ ctx, msg: "post:parseRootNote" });
        if (!rootProps.matchHash) {
            cacheUpdates[rootNote.fname] = (0, utils_1.createCacheEntry)({
                noteProps: rootNote,
                hash: rootProps.noteHash,
            });
        }
        // get root of hiearchies
        let lvl = 2;
        let prevNodes = (await (0, common_all_1.asyncLoopOneAtATime)(fileMetaDict[1]
            // don't count root node
            .filter((n) => n.fpath !== "root.md"), async (ent) => {
            try {
                const out = await this.parseNoteProps({
                    fileMeta: ent,
                    addParent: false,
                    vault,
                    config,
                    errors,
                });
                const parsedNote = out.changeEntries[0].note;
                unseenKeys.delete(parsedNote.fname);
                if (!out.matchHash) {
                    cacheUpdates[parsedNote.fname] = (0, utils_1.createCacheEntry)({
                        noteProps: parsedNote,
                        hash: out.noteHash,
                    });
                }
                return parsedNote;
            }
            catch (err) {
                const dendronError = common_all_1.ErrorFactory.wrapIfNeeded(err);
                // A fatal error would kill the initialization
                dendronError.severity = common_all_1.ERROR_SEVERITY.MINOR;
                dendronError.message =
                    `Failed to read ${ent.fpath} in ${vault.fsPath}: ` +
                        dendronError.message;
                errors.push(dendronError);
                return;
            }
        })).filter(common_all_1.isNotUndefined);
        prevNodes.forEach((ent) => {
            common_all_1.DNodeUtils.addChild(rootNote, ent);
            // Check for duplicate IDs when adding notes to the map
            if (notesById[ent.id] !== undefined) {
                const duplicate = notesById[ent.id];
                errors.push(new common_all_1.DuplicateNoteError({
                    noteA: duplicate,
                    noteB: ent,
                }));
            }
            common_all_1.NoteDictsUtils.add(ent, noteDicts);
        });
        // Root node children have updated
        common_all_1.NoteDictsUtils.add(rootNote, noteDicts);
        unseenKeys.delete(rootNote.fname);
        this.logger.info({ ctx, msg: "post:parseDomainNotes" });
        // get everything else
        while (lvl <= maxLvl) {
            const currNodes = (await (0, common_all_1.asyncLoopOneAtATime)((fileMetaDict[lvl] || []).filter((ent) => {
                return !(0, common_all_1.globMatch)(["root.*"], ent.fpath);
            }), async (ent) => {
                try {
                    const resp = await this.parseNoteProps({
                        fileMeta: ent,
                        noteDicts: { notesById, notesByFname },
                        addParent: true,
                        vault,
                        config,
                        errors,
                    });
                    const parsedNote = resp.changeEntries[0].note;
                    unseenKeys.delete(parsedNote.fname);
                    // this indicates that the contents of the note was different
                    // then what was in the cache. need to update later ^cache-update
                    if (!resp.matchHash) {
                        cacheUpdates[parsedNote.fname] = (0, utils_1.createCacheEntry)({
                            noteProps: parsedNote,
                            hash: resp.noteHash,
                        });
                    }
                    // need to be inside this loop
                    // deal with `src/__tests__/enginev2.spec.ts`, with stubs/ test case
                    resp.changeEntries.forEach((ent) => {
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
                    return parsedNote;
                }
                catch (err) {
                    const dendronError = common_all_1.ErrorFactory.wrapIfNeeded(err);
                    // A fatal error would kill the initialization
                    dendronError.severity = common_all_1.ERROR_SEVERITY.MINOR;
                    dendronError.message =
                        `Failed to read ${ent.fpath} in ${vault.fsPath}: ` +
                            dendronError.message;
                    errors.push(dendronError);
                    return undefined;
                }
            })).filter(common_all_1.isNotUndefined);
            lvl += 1;
            prevNodes = currNodes;
        }
        this.logger.info({ ctx, msg: "post:parseAllNotes" });
        // add schemas
        const domains = notesById[rootNote.id].children.map((ent) => notesById[ent]);
        domains.map((d) => {
            common_all_1.SchemaUtils.matchDomain(d, notesById, schemas);
        });
        // Remove stale entries from cache
        unseenKeys.forEach((unseenKey) => {
            this.cache.drop(unseenKey);
        });
        // OPT:make async and don't wait for return
        // Skip this if we found no notes, which means vault did not initialize
        if ((lodash_1.default.size(notesById) > 0 && this.cache.numCacheMisses > 0) ||
            unseenKeys.size > 0) {
            this.cache.writeToFileSystem();
        }
        this.logger.info({ ctx, msg: "post:matchSchemas" });
        if (opts === null || opts === void 0 ? void 0 : opts.useSQLiteMetadataStore) {
            this.logger.info({ ctx, msg: "initialize metadata" });
            if (await SQLiteMetadataStore_1.SQLiteMetadataStore.isVaultInitialized(vault)) {
                this.logger.info({ ctx, msg: "adding update entries" });
                // initialized, update based on cache
                const updateDict = {};
                lodash_1.default.map(cacheUpdates, (v, _k) => {
                    // TODO: we need to figure out the right data type to insert into metadata store
                    updateDict[v.data.id] = v.data;
                });
                await SQLiteMetadataStore_1.SQLiteMetadataStore.bulkInsertAllNotes({
                    notesIdDict: updateDict,
                });
            }
            else {
                this.logger.info({ ctx, msg: "updating all entries" });
                // we never initialized this vault, initialize it now
                try {
                    // create the vault
                    await SQLiteMetadataStore_1.SQLiteMetadataStore.prisma().dVault.create({
                        data: { fsPath: vault.fsPath, wsRoot },
                    });
                    // if vault is not initialized, bulk insert all note metadata into sqlite
                    await SQLiteMetadataStore_1.SQLiteMetadataStore.bulkInsertAllNotes({
                        notesIdDict: notesById,
                    });
                }
                catch (err) {
                    this.logger.error({ ctx, msg: "issue doing bulk insert", vault });
                    throw err;
                }
            }
        }
        return { notesById, cacheUpdates, errors };
    }
    /**
     *
     * @param opts
     * @returns List of all notes added. If a note has no direct parents, stub notes are added instead
     */
    async parseNoteProps(opts) {
        const cleanOpts = lodash_1.default.defaults(opts, {
            addParent: true,
            createStubs: true,
            noteDicts: {
                notesById: {},
                notesByFname: {},
            },
            parents: [],
        });
        const { fileMeta, noteDicts, vault, config, errors } = cleanOpts;
        const ctx = "parseNoteProps";
        this.logger.debug({ ctx, msg: "enter", fileMeta });
        const wsRoot = this.opts.store.wsRoot;
        const vpath = (0, common_server_1.vault2Path)({ vault, wsRoot });
        let changeEntries = [];
        let noteProps;
        let noteHash;
        let matchHash;
        // get note props
        try {
            ({
                note: noteProps,
                noteHash,
                matchHash,
            } = await this.file2NoteWithCache({
                fpath: path_1.default.join(vpath, fileMeta.fpath),
                vault,
                errors,
                config,
            }));
        }
        catch (_err) {
            if (!common_all_1.ErrorUtils.isDendronError(_err)) {
                const err = common_all_1.DendronError.createFromStatus({
                    status: common_all_1.ERROR_STATUS.BAD_PARSE_FOR_NOTE,
                    severity: common_all_1.ERROR_SEVERITY.MINOR,
                    payload: { fname: fileMeta.fpath, error: (0, common_all_1.stringifyError)(_err) },
                    message: `${fileMeta.fpath} could not be parsed`,
                });
                this.logger.error({ ctx, err });
                throw err;
            }
            throw _err;
        }
        changeEntries.push({
            status: "create",
            note: noteProps,
        });
        // add parent
        if (cleanOpts.addParent) {
            const changed = common_all_1.NoteUtils.addOrUpdateParents({
                note: noteProps,
                noteDicts,
                createStubs: cleanOpts.createStubs,
            });
            changeEntries = changeEntries.concat(changed);
        }
        return {
            changeEntries,
            noteHash,
            matchHash,
        };
    }
    async file2NoteWithCache({ fpath, vault, toLowercase, config, errors, }) {
        const content = fs_extra_1.default.readFileSync(fpath, { encoding: "utf8" });
        const { name } = path_1.default.parse(fpath);
        const sig = (0, common_all_1.genHash)(content);
        const cacheEntry = this.cache.get(name);
        const matchHash = (cacheEntry === null || cacheEntry === void 0 ? void 0 : cacheEntry.hash) === sig;
        const fname = toLowercase ? name.toLowerCase() : name;
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
                return { note, matchHash, noteHash: sig };
            }
        }
        // If hash is different, then we update all links and anchors ^link-anchor
        // Update cache entry as well
        note = (0, common_all_1.string2Note)({ content, fname, vault });
        note.contentHash = sig;
        // Link/anchor errors should be logged but not interfere with rest of parsing
        try {
            await utils_1.EngineUtils.refreshNoteLinksAndAnchors({
                note,
                engine: this.engine,
                silent: true,
                config,
            });
        }
        catch (_err) {
            errors.push(common_all_1.ErrorFactory.wrapIfNeeded(_err));
        }
        this.cache.set(name, (0, utils_1.createCacheEntry)({
            noteProps: note,
            hash: note.contentHash,
        }));
        this.cache.incrementCacheMiss();
        return { note, matchHash, noteHash: sig };
    }
}
exports.NoteParser = NoteParser;
//# sourceMappingURL=noteParser.js.map