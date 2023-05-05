"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEngineV3 = exports.DendronEngineV3 = void 0;
const common_all_1 = require("@dendronhq/common-all");
const common_server_1 = require("@dendronhq/common-server");
const unified_1 = require("@dendronhq/unified");
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
const notesFileSystemCache_1 = require("./cache/notesFileSystemCache");
const NoteParserV2_1 = require("./drivers/file/NoteParserV2");
const schemaParser_1 = require("./drivers/file/schemaParser");
const store_1 = require("./store");
const hooks_1 = require("./topics/hooks");
const engineUtils_1 = require("./utils/engineUtils");
class DendronEngineV3 extends common_all_1.EngineV3Base {
    constructor(props) {
        super(props);
        this.wsRoot = props.wsRoot;
        const hooks = common_all_1.ConfigUtils.getWorkspace(props.config).hooks || {
            onCreate: [],
        };
        this.hooks = hooks;
        this._renderedCache = this.createRenderedCache(props.config);
        this._fileStore = props.fileStore;
        this._noteStore = props.noteStore;
        this._schemaStore = props.schemaStore;
    }
    static create({ wsRoot, logger }) {
        const LOGGER = logger || (0, common_server_1.createLogger)();
        const { error, data: config } = common_server_1.DConfig.readConfigAndApplyLocalOverrideSync(wsRoot);
        if (error) {
            LOGGER.error((0, common_all_1.stringifyError)(error));
        }
        const fileStore = new store_1.NodeJSFileStore();
        const fuseEngine = new common_all_1.FuseEngine({
            fuzzThreshold: common_all_1.ConfigUtils.getLookup(config).note.fuzzThreshold,
        });
        return new DendronEngineV3({
            wsRoot,
            vaults: common_all_1.ConfigUtils.getVaults(config),
            noteStore: new common_all_1.NoteStore(fileStore, new common_all_1.NoteMetadataStore(fuseEngine), common_all_1.URI.file(wsRoot)),
            schemaStore: new common_all_1.SchemaStore(fileStore, new common_all_1.SchemaMetadataStore(fuseEngine), common_all_1.URI.parse(wsRoot)),
            fileStore,
            logger: LOGGER,
            config,
        });
    }
    /**
     * Does not throw error but returns it
     */
    async init() {
        var _a;
        const { data: config } = common_server_1.DConfig.readConfigAndApplyLocalOverrideSync(this.wsRoot);
        const defaultResp = {
            notes: {},
            schemas: {},
            wsRoot: this.wsRoot,
            vaults: this.vaults,
            config,
        };
        try {
            const { data: schemas, error: schemaErrors } = await this.initSchema();
            if (lodash_1.default.isUndefined(schemas)) {
                return {
                    data: defaultResp,
                    error: common_all_1.DendronError.createFromStatus({
                        message: "No schemas found",
                        status: common_all_1.ERROR_STATUS.UNKNOWN,
                        severity: common_all_1.ERROR_SEVERITY.FATAL,
                    }),
                };
            }
            const schemaDict = {};
            schemas.forEach((schema) => {
                // TODO: what if there are duplicate schema.root.id
                schemaDict[schema.root.id] = schema;
            });
            // Write schema data prior to initializing notes, so that the schema
            // information can correctly get applied to the notes.
            const bulkWriteSchemaOpts = schemas.map((schema) => {
                return { key: schema.root.id, schema };
            });
            this._schemaStore.dispose();
            this._schemaStore.bulkWriteMetadata(bulkWriteSchemaOpts);
            const { data: noteDicts, error: noteErrors } = await this.initNotes(schemaDict);
            const { notesById } = noteDicts;
            if (lodash_1.default.isUndefined(notesById)) {
                return {
                    data: defaultResp,
                    error: common_all_1.DendronError.createFromStatus({
                        message: "No notes found",
                        status: common_all_1.ERROR_STATUS.UNKNOWN,
                        severity: common_all_1.ERROR_SEVERITY.FATAL,
                    }),
                };
            }
            // Backlink candidates have to be done after notes are initialized because it depends on the engine already having notes in it
            if ((_a = config.dev) === null || _a === void 0 ? void 0 : _a.enableLinkCandidates) {
                const ctx = "_addLinkCandidates";
                const start = process.hrtime();
                this.logger.info({ ctx, msg: "pre:addLinkCandidates" });
                // Mutates existing note objects so we don't need to reset the notes
                const maxNoteLength = common_all_1.ConfigUtils.getWorkspace(config).maxNoteLength;
                this.updateNotesWithLinkCandidates(noteDicts, maxNoteLength, config);
                const duration = (0, common_server_1.getDurationMilliseconds)(start);
                this.logger.info({ ctx, duration });
            }
            const bulkWriteOpts = lodash_1.default.values(notesById).map((note) => {
                const noteMeta = lodash_1.default.omit(note, ["body"]);
                return { key: note.id, noteMeta };
            });
            this._noteStore.dispose();
            this._noteStore.bulkWriteMetadata(bulkWriteOpts);
            const hookErrors = [];
            this.hooks.onCreate = this.hooks.onCreate.filter((hook) => {
                const { valid, error } = hooks_1.HookUtils.validateHook({
                    hook,
                    wsRoot: this.wsRoot,
                });
                if (!valid && error) {
                    this.logger.error({ msg: "bad hook", hook, error });
                    hookErrors.push(error);
                }
                return valid;
            });
            let allErrors = noteErrors ? hookErrors.concat(noteErrors) : hookErrors;
            allErrors = schemaErrors ? allErrors.concat(schemaErrors) : allErrors;
            let error;
            switch (lodash_1.default.size(allErrors)) {
                case 0: {
                    break;
                }
                case 1: {
                    error = new common_all_1.DendronError(allErrors[0]);
                    break;
                }
                default:
                    error = new common_all_1.DendronCompositeError(allErrors);
            }
            this.logger.info({
                ctx: "init:ext",
                error,
                storeError: allErrors,
                hookErrors,
            });
            return {
                error,
                data: {
                    notes: notesById,
                    wsRoot: this.wsRoot,
                    vaults: this.vaults,
                    config,
                },
            };
        }
        catch (error) {
            const { message, stack, status } = error;
            const payload = { message, stack };
            return {
                data: defaultResp,
                error: common_all_1.DendronError.createPlainError({
                    payload,
                    message,
                    status,
                    severity: common_all_1.ERROR_SEVERITY.FATAL,
                }),
            };
        }
    }
    /**
     * See {@link DEngine.writeNote}
     */
    async writeNote(note, opts) {
        let changes = [];
        const ctx = "DEngine:writeNewNote";
        this.logger.info({
            ctx,
            msg: `enter with ${opts}`,
            note: common_all_1.NoteUtils.toLogObj(note),
        });
        const { data: config } = common_server_1.DConfig.readConfigAndApplyLocalOverrideSync(this.wsRoot);
        // Update links/anchors based on note body
        await engineUtils_1.EngineUtils.refreshNoteLinksAndAnchors({
            note,
            engine: this,
            config,
        });
        // Apply hooks
        if ((opts === null || opts === void 0 ? void 0 : opts.runHooks) === false) {
            this.logger.info({
                ctx,
                msg: "hooks disabled for write",
            });
        }
        else {
            const hooks = lodash_1.default.filter(this.hooks.onCreate, (hook) => common_all_1.NoteUtils.match({ notePath: note.fname, pattern: hook.pattern }));
            const resp = await lodash_1.default.reduce(hooks, async (notePromise, hook) => {
                const { note } = await notePromise;
                const script = hooks_1.HookUtils.getHookScriptPath({
                    wsRoot: this.wsRoot,
                    basename: hook.id + ".js",
                });
                return hooks_1.HookUtils.requireHook({
                    note,
                    fpath: script,
                    wsRoot: this.wsRoot,
                });
            }, Promise.resolve({ note })).catch((err) => new common_all_1.DendronError({
                severity: common_all_1.ERROR_SEVERITY.MINOR,
                message: "error with hook",
                payload: (0, common_all_1.stringifyError)(err),
            }));
            if (resp instanceof common_all_1.DendronError) {
                this.logger.error({ ctx, error: (0, common_all_1.stringifyError)(resp) });
                return { error: resp };
            }
            else {
                const valResp = common_all_1.NoteUtils.validate(resp.note);
                if (valResp.error) {
                    this.logger.error({ ctx, error: (0, common_all_1.stringifyError)(valResp.error) });
                    return { error: valResp.error };
                }
                else {
                    note = resp.note;
                    this.logger.info({ ctx, msg: "fin:RunHooks", payload: resp.payload });
                }
            }
        }
        // Check if another note with same fname and vault exists
        const resp = await this._noteStore.find({
            fname: note.fname,
            vault: note.vault,
        });
        const existingNote = resp.data ? resp.data[0] : undefined;
        // If a note exists with a different id but same fname/vault, then we throw an error unless its a stub or override is set
        if (existingNote && existingNote.id !== note.id) {
            // If note is a stub or client wants to override existing note, we need to update parent/children relationships since ids are different
            // The parent of this note needs to have the old note removed (because the id is now different)
            // The new note needs to have the old note's children
            if (existingNote.stub || (opts === null || opts === void 0 ? void 0 : opts.overrideExisting)) {
                // make sure existing note actually has a parent.
                if (!existingNote.parent) {
                    // TODO: We should be able to handle rewriting of root. This happens
                    // with certain operations such as Doctor FixFrontmatter
                    return {
                        error: new common_all_1.DendronError({
                            status: common_all_1.ERROR_STATUS.NO_PARENT_FOR_NOTE,
                            message: `No parent found for ${existingNote.fname}`,
                        }),
                    };
                }
                const parentResp = await this._noteStore.get(existingNote.parent);
                if (parentResp.error) {
                    return {
                        error: new common_all_1.DendronError({
                            status: common_all_1.ERROR_STATUS.NO_PARENT_FOR_NOTE,
                            message: `No parent found for ${existingNote.fname}`,
                            innerError: parentResp.error,
                        }),
                    };
                }
                // Save the state of the parent to later record changed entry.
                const parent = parentResp.data;
                const prevParentState = { ...parent };
                // Update existing note's parent so that it doesn't hold the existing note's id as children
                common_all_1.DNodeUtils.removeChild(parent, existingNote);
                // Update parent note of existing note so that the newly created note is a child
                common_all_1.DNodeUtils.addChild(parent, note);
                // Add an entry for the updated parent
                changes.push({
                    prevNote: prevParentState,
                    note: parent,
                    status: "update",
                });
                // Move children to new note
                changes = changes.concat(await this.updateChildrenWithNewParent(existingNote, note));
                // Delete the existing note from metadata store. Since fname/vault are the same, no need to touch filesystem
                changes.push({ note: existingNote, status: "delete" });
            }
            else {
                return {
                    error: new common_all_1.DendronError({
                        message: `Cannot write note with id ${note.id}. Note ${existingNote.id} with same fname and vault exists`,
                    }),
                };
            }
        }
        else if (!existingNote && !(opts === null || opts === void 0 ? void 0 : opts.noAddParent)) {
            // If existing note does not exist, check if we need to add parents
            // eg. if user created `baz.one.two` and neither `baz` or `baz.one` exist, then they need to be created
            // this is the default behavior
            const ancestorResp = await this.findClosestAncestor(note.fname, note.vault);
            if (ancestorResp.data) {
                const ancestor = ancestorResp.data;
                const prevAncestorState = { ...ancestor };
                // Create stubs for any uncreated notes between ancestor and note
                const stubNodes = common_all_1.NoteUtils.createStubs(ancestor, note);
                stubNodes.forEach((stub) => {
                    changes.push({
                        status: "create",
                        note: stub,
                    });
                });
                changes.push({
                    status: "update",
                    prevNote: prevAncestorState,
                    note: ancestor,
                });
            }
            else {
                this.logger.error({
                    ctx,
                    msg: `Unable to find ancestor for note ${note.fname}`,
                });
                return { error: ancestorResp.error };
            }
        }
        // Write to metadata store and/or filesystem
        const writeResp = (opts === null || opts === void 0 ? void 0 : opts.metaOnly)
            ? await this._noteStore.writeMetadata({ key: note.id, noteMeta: note })
            : await this._noteStore.write({ key: note.id, note });
        if (writeResp.error) {
            return {
                error: new common_all_1.DendronError({
                    message: `Unable to write note ${note.id}`,
                    severity: common_all_1.ERROR_SEVERITY.MINOR,
                    payload: writeResp.error,
                }),
            };
        }
        // Add schema if this is a new note
        if (existingNote) {
            note.schema = existingNote.schema;
        }
        else {
            const domainName = common_all_1.DNodeUtils.domainName(note.fname);
            const maybeSchemaModule = await this._schemaStore.getMetadata(domainName);
            if (maybeSchemaModule.data) {
                const schemaMatch = common_all_1.SchemaUtils.findSchemaFromModule({
                    notePath: note.fname,
                    schemaModule: maybeSchemaModule.data,
                });
                if (schemaMatch) {
                    this.logger.info({
                        ctx,
                        msg: "pre:addSchema",
                    });
                    const { schema, schemaModule } = schemaMatch;
                    common_all_1.NoteUtils.addSchema({ note, schema, schemaModule });
                }
            }
        }
        // If a note exist with the same id, then we treat this as an update
        if (existingNote && existingNote.id === note.id) {
            /**
             * Calculate diff of links with the `to` prop that have changed.
             * For links that have been removed, delete those backlinks from the toNotes.
             * For links that have been added, create backlinks for the toNotes
             */
            const deletedLinks = existingNote.links.filter((link) => {
                var _a;
                return ((_a = link.to) === null || _a === void 0 ? void 0 : _a.fname) &&
                    !note.links.some((linkToCompare) => common_all_1.DLinkUtils.isEquivalent(link, linkToCompare));
            });
            const addedLinks = note.links.filter((link) => {
                var _a;
                return ((_a = link.to) === null || _a === void 0 ? void 0 : _a.fname) &&
                    !existingNote.links.some((linkToCompare) => common_all_1.DLinkUtils.isEquivalent(link, linkToCompare));
            });
            const addedChanges = await Promise.all(addedLinks.map((link) => {
                return this.addBacklink(link);
            }));
            const removedChanges = await Promise.all(deletedLinks.map((link) => {
                return this.removeBacklink(link);
            }));
            changes = changes.concat(addedChanges.flat());
            changes = changes.concat(removedChanges.flat());
            changes.push({ prevNote: existingNote, note, status: "update" });
        }
        else {
            // If this is a new note, add backlinks if applicable to referenced notes
            const backlinkChanges = await Promise.all(note.links.map((link) => this.addBacklink(link)));
            changes = changes.concat(backlinkChanges.flat());
            changes.push({ note, status: "create" });
        }
        // Propragate metadata for all other changes
        await this.updateNoteMetadataStore(changes);
        this.logger.info({
            ctx,
            msg: "exit",
            changed: changes.map((n) => common_all_1.NoteUtils.toLogObj(n.note)),
        });
        return {
            data: changes,
        };
    }
    /**
     * See {@link DEngine.renameNote}
     *
     * TODO: make atomic
     */
    async renameNote(opts) {
        const ctx = "DEngine:renameNote";
        const { oldLoc, newLoc } = opts;
        this.logger.info({ ctx, msg: "enter", opts });
        const oldVault = common_all_1.VaultUtils.getVaultByName({
            vaults: this.vaults,
            vname: oldLoc.vaultName,
        });
        if (!oldVault) {
            return {
                error: new common_all_1.DendronError({
                    message: "vault not found for old location",
                }),
            };
        }
        const oldNote = (await this.findNotes({
            fname: oldLoc.fname,
            vault: oldVault,
        }))[0];
        if (!oldNote) {
            return {
                error: new common_all_1.DendronError({
                    status: common_all_1.ERROR_STATUS.DOES_NOT_EXIST,
                    message: `Unable to rename note "${oldLoc.fname}" in vault "${common_all_1.VaultUtils.getName(oldVault)}".` +
                        ` Check that this note exists, and make sure it has a frontmatter with an id.`,
                    severity: common_all_1.ERROR_SEVERITY.FATAL,
                }),
            };
        }
        const newNoteTitle = common_all_1.NoteUtils.isDefaultTitle(oldNote)
            ? common_all_1.NoteUtils.genTitle(newLoc.fname)
            : oldNote.title;
        // If the rename operation is changing the title and the caller did not tell us to use a special alias, calculate the alias change.
        // The aliases of links to this note will only change if they match the old note's title.
        if (newNoteTitle !== oldNote.title && !oldLoc.alias && !newLoc.alias) {
            oldLoc.alias = oldNote.title;
            newLoc.alias = newNoteTitle;
        }
        let notesChangedEntries = [];
        // Get list of notes referencing old note. We need to rename those references
        const notesReferencingOld = lodash_1.default.uniq(oldNote.links
            .filter((link) => link.type === "backlink")
            .map((link) => link.from.id)
            .filter(common_all_1.isNotUndefined));
        const linkNotesResp = await this._noteStore.bulkGet(notesReferencingOld);
        // update note body of all notes that have changed
        const { data: config } = common_server_1.DConfig.readConfigAndApplyLocalOverrideSync(this.wsRoot);
        const notesToUpdate = linkNotesResp
            .map((resp) => {
            if (resp.error) {
                this.logger.error({
                    ctx,
                    message: `Unable to find note linking to ${oldNote.fname}`,
                    error: (0, common_all_1.stringifyError)(resp.error),
                });
                return undefined;
            }
            else {
                const note = this.processNoteChangedByRename({
                    note: resp.data,
                    oldLoc,
                    newLoc,
                    config,
                });
                if (note && note.id === oldNote.id) {
                    // If note being renamed has references to itself, make sure to update those as well
                    oldNote.body = note.body;
                    oldNote.tags = note.tags;
                }
                return note;
            }
        })
            .filter(common_all_1.isNotUndefined);
        this.logger.info({ ctx, msg: "updateAllNotes:pre" });
        const writeResp = await this.bulkWriteNotes({ notes: notesToUpdate });
        if (writeResp.error) {
            return {
                error: new common_all_1.DendronError({
                    message: `Unable to update note link references`,
                    innerError: writeResp.error,
                }),
            };
        }
        notesChangedEntries = notesChangedEntries.concat(writeResp.data);
        /**
         * If the event source is not engine(ie: vscode rename context menu), we do not want to
         * delete the original files. We just update the references on onWillRenameFiles and return.
         */
        const newNote = {
            ...oldNote,
            fname: newLoc.fname,
            vault: common_all_1.VaultUtils.getVaultByName({
                vaults: this.vaults,
                vname: newLoc.vaultName,
            }),
            title: newNoteTitle,
            // when renaming, we are moving a note into a completely different hierarchy.
            // we are not concerned with the children it has, so the new note
            // shouldn't inherit the old note's children.
            children: [],
        };
        // NOTE: order matters. need to delete old note, otherwise can't write new note
        this.logger.info({
            ctx,
            msg: "deleteNote:meta:pre",
            note: common_all_1.NoteUtils.toLogObj(oldNote),
        });
        if (oldNote.fname.toLowerCase() === newNote.fname.toLowerCase() &&
            common_all_1.VaultUtils.isEqual(oldNote.vault, newNote.vault, this.wsRoot)) {
            // The file is being renamed to itself. We do this to rename a header.
            this.logger.info({ ctx, msg: "Renaming the file to same name" });
            // Add the old note's children back in
            newNote.children = oldNote.children;
        }
        else {
            // The file is being renamed to a new file. Delete old file first
            this.logger.info({ ctx, msg: "Renaming the file to a new name" });
            const out = await this.deleteNote(oldNote.id, {
                metaOnly: opts.metaOnly,
            });
            if (out.error) {
                return {
                    error: new common_all_1.DendronError({
                        message: `Unable to delete note "${oldNote.fname}" in vault "${common_all_1.VaultUtils.getName(oldNote.vault)}".` +
                            ` Check that this note exists, and make sure it has a frontmatter with an id.`,
                        severity: common_all_1.ERROR_SEVERITY.FATAL,
                        innerError: out.error,
                    }),
                };
            }
            if (out.data) {
                notesChangedEntries = notesChangedEntries.concat(out.data);
            }
        }
        this.logger.info({
            ctx,
            msg: "writeNewNote:pre",
            note: common_all_1.NoteUtils.toLogObj(newNote),
        });
        const out = await this.writeNote(newNote, { metaOnly: opts.metaOnly });
        if (out.error) {
            return {
                error: new common_all_1.DendronError({
                    message: `Unable to write new renamed note for ${newNote.fname}`,
                    innerError: out.error,
                }),
            };
        }
        if (out.data) {
            notesChangedEntries = notesChangedEntries.concat(out.data);
        }
        this.logger.info({ ctx, msg: "exit", opts, out: notesChangedEntries });
        return { data: notesChangedEntries };
    }
    /**
     * See {@link DEngine.getSchema}
     */
    async getSchema(id) {
        return this._schemaStore.getMetadata(id);
    }
    /**
     * See {@link DEngine.writeSchema}
     */
    async writeSchema(schema, opts) {
        const resp = (opts === null || opts === void 0 ? void 0 : opts.metaOnly)
            ? await this._schemaStore.writeMetadata({ key: schema.root.id, schema })
            : await this._schemaStore.write({ key: schema.root.id, schema });
        if (resp.error) {
            return { error: resp.error };
        }
        return { data: undefined };
    }
    /**
     * See {@link DEngine.deleteSchema}
     */
    async deleteSchema(id, opts) {
        if (opts === null || opts === void 0 ? void 0 : opts.metaOnly) {
            await this._schemaStore.deleteMetadata(id);
        }
        else {
            await this._schemaStore.delete(id);
        }
        // TODO: rework this to make more efficient
        return this.init();
    }
    async info() {
        const version = common_server_1.NodeJSUtils.getVersionFromPkg();
        if (!version) {
            return {
                error: common_all_1.DendronError.createPlainError({
                    message: "Unable to read Dendron version",
                }),
            };
        }
        return {
            data: {
                version,
            },
        };
    }
    /**
     * See {@link DEngine.querySchema}
     */
    async querySchema(queryString) {
        const ctx = "DEngine:querySchema";
        const schemas = await this._schemaStore.queryMetadata({
            qs: queryString,
        });
        if (schemas.isErr()) {
            return { error: schemas.error };
        }
        this.logger.info({ ctx, msg: "exit" });
        return {
            data: schemas.value,
        };
    }
    async renderNote({ id, note, flavor, dest, }) {
        const ctx = "DEngine:renderNote";
        // If provided, we render the given note entirely. Otherwise find the note in workspace.
        if (!note) {
            note = (await this.getNote(id)).data;
        }
        // If note was not provided and we couldn't find it, we can't render.
        if (!note) {
            return {
                error: common_all_1.DendronError.createFromStatus({
                    status: common_all_1.ERROR_STATUS.INVALID_STATE,
                    message: `${id} does not exist`,
                }),
            };
        }
        const cachedPreview = this._renderedCache.get(id);
        if (cachedPreview) {
            if (await this.isCachedPreviewUpToDate(cachedPreview, note)) {
                this.logger.info({ ctx, id, msg: `Will use cached rendered preview.` });
                // Cached preview updated time is the same as note.updated time.
                // Hence we can skip re-rendering and return the cached version of preview.
                return { data: cachedPreview.data };
            }
        }
        this.logger.info({
            ctx,
            id,
            msg: `Did not find usable cached rendered preview. Starting to render.`,
        });
        const beforeRenderMillis = (0, common_all_1.milliseconds)();
        // Either we don't have have the cached preview or the version that is
        // cached has gotten stale, hence we will re-render the note and cache
        // the new value.
        let data;
        try {
            data = await this._renderNote({
                note,
                flavor: flavor || common_all_1.ProcFlavor.PREVIEW,
                dest: dest || common_all_1.DendronASTDest.HTML,
            });
        }
        catch (error) {
            return {
                error: new common_all_1.DendronError({
                    message: `Unable to render note ${note.fname} in ${common_all_1.VaultUtils.getName(note.vault)}`,
                    payload: error,
                }),
            };
        }
        this._renderedCache.set(id, {
            updated: note.updated,
            contentHash: note.contentHash,
            data,
        });
        const duration = (0, common_all_1.milliseconds)() - beforeRenderMillis;
        this.logger.info({ ctx, id, duration, msg: `Render preview finished.` });
        if (common_all_1.NoteUtils.isFileId(note.id)) {
            // Dummy note, we should remove it once we're done rendering
            await this.deleteNote(note.id, { metaOnly: true });
        }
        return { data };
    }
    async getNoteBlocks(opts) {
        const note = (await this.getNote(opts.id)).data;
        try {
            if (lodash_1.default.isUndefined(note)) {
                return {
                    error: common_all_1.DendronError.createFromStatus({
                        status: common_all_1.ERROR_STATUS.INVALID_STATE,
                        message: `${opts.id} does not exist`,
                    }),
                };
            }
            const { data: config } = common_server_1.DConfig.readConfigAndApplyLocalOverrideSync(this.wsRoot);
            const blocks = await unified_1.RemarkUtils.extractBlocks({
                note,
                config,
            });
            if (opts.filterByAnchorType) {
                lodash_1.default.remove(blocks, (block) => { var _a; return ((_a = block.anchor) === null || _a === void 0 ? void 0 : _a.type) !== opts.filterByAnchorType; });
            }
            return { data: blocks };
        }
        catch (err) {
            return {
                error: err,
            };
        }
    }
    async getDecorations(opts) {
        const note = (await this.getNote(opts.id)).data;
        try {
            if (lodash_1.default.isUndefined(note)) {
                return {
                    error: common_all_1.DendronError.createFromStatus({
                        status: common_all_1.ERROR_STATUS.INVALID_STATE,
                        message: `${opts.id} does not exist`,
                    }),
                    data: {},
                };
            }
            // Very weirdly, these range numbers turn into strings when getting called in through the API.
            // Not sure if I'm missing something.
            opts.ranges = opts.ranges.map((item) => {
                return {
                    text: item.text,
                    range: (0, common_all_1.newRange)(lodash_1.default.toNumber(item.range.start.line), lodash_1.default.toNumber(item.range.start.character), lodash_1.default.toNumber(item.range.end.line), lodash_1.default.toNumber(item.range.end.character)),
                };
            });
            const { data: config } = common_server_1.DConfig.readConfigAndApplyLocalOverrideSync(this.wsRoot);
            const { allDecorations: decorations, allDiagnostics: diagnostics, allErrors: errors, } = await (0, unified_1.runAllDecorators)({ ...opts, note, engine: this, config });
            let error;
            if (errors && errors.length > 1)
                error = new common_all_1.DendronCompositeError(errors);
            else if (errors && errors.length === 1)
                error = errors[0];
            return {
                data: {
                    decorations,
                    diagnostics,
                },
                error,
            };
        }
        catch (err) {
            return {
                error: err,
                data: {},
            };
        }
    }
    async initSchema() {
        const ctx = "DEngine:initSchema";
        this.logger.info({ ctx, msg: "enter" });
        let errorList = [];
        const schemaResponses = await Promise.all(this.vaults.map(async (vault) => {
            const vpath = (0, common_server_1.vault2Path)({ vault, wsRoot: this.wsRoot });
            // Get list of files from filesystem
            const maybeFiles = await this._fileStore.readDir({
                root: common_all_1.URI.file(vpath),
                include: ["*.schema.yml"],
            });
            if (maybeFiles.error || maybeFiles.data.length === 0) {
                // Keep initializing other vaults
                return {
                    error: new common_all_1.DendronCompositeError([
                        new common_all_1.DendronError({
                            message: `Unable to get schemas for vault ${common_all_1.VaultUtils.getName(vault)}`,
                            status: common_all_1.ERROR_STATUS.NO_SCHEMA_FOUND,
                            severity: common_all_1.ERROR_SEVERITY.MINOR,
                            payload: maybeFiles.error,
                        }),
                    ]),
                    data: [],
                };
            }
            const schemaFiles = maybeFiles.data.map((entry) => entry.toString());
            this.logger.info({ ctx, schemaFiles });
            const { schemas, errors } = await new schemaParser_1.SchemaParser({
                wsRoot: this.wsRoot,
                logger: this.logger,
            }).parse(schemaFiles, vault);
            if (errors) {
                errorList = errorList.concat(errors);
            }
            return {
                data: schemas,
                error: lodash_1.default.isNull(errors)
                    ? undefined
                    : new common_all_1.DendronCompositeError(errors),
            };
        }));
        const errors = schemaResponses
            .flatMap((response) => response.error)
            .filter(common_all_1.isNotUndefined);
        return {
            error: errors.length > 0 ? new common_all_1.DendronCompositeError(errors) : undefined,
            data: schemaResponses
                .flatMap((response) => response.data)
                .filter(common_all_1.isNotUndefined),
        };
    }
    /**
     * Construct dictionary of NoteProps from workspace on filesystem
     *
     * For every vault on the filesystem, get list of files and convert each file to NoteProp
     * @returns NotePropsByIdDict
     */
    async initNotes(schemas) {
        const ctx = "DEngine:initNotes";
        this.logger.info({ ctx, msg: "enter" });
        let errors = [];
        let notesFname = {};
        const start = process.hrtime();
        const allNotesList = await Promise.all(this.vaults.map(async (vault) => {
            const vpath = (0, common_server_1.vault2Path)({ vault, wsRoot: this.wsRoot });
            // Get list of files from filesystem
            const maybeFiles = await this._fileStore.readDir({
                root: common_all_1.URI.file(vpath),
                include: ["*.md"],
            });
            if (maybeFiles.error) {
                // Keep initializing other vaults
                errors = errors.concat([
                    new common_all_1.DendronError({
                        message: `Unable to read notes for vault ${common_all_1.VaultUtils.getName(vault)}`,
                        severity: common_all_1.ERROR_SEVERITY.MINOR,
                        payload: maybeFiles.error,
                    }),
                ]);
                return {};
            }
            // Load cache from vault
            const cachePath = path_1.default.join(vpath, common_all_1.CONSTANTS.DENDRON_CACHE_FILE);
            const notesCache = new notesFileSystemCache_1.NotesFileSystemCache({
                cachePath,
                // TODO: clean up
                noCaching: false,
                logger: this.logger,
            });
            const { noteDicts, errors: parseErrors } = await new NoteParserV2_1.NoteParserV2({
                cache: notesCache,
                engine: this,
                logger: this.logger,
            }).parseFiles(maybeFiles.data, vault, schemas);
            errors = errors.concat(parseErrors);
            if (noteDicts) {
                const { notesById, notesByFname } = noteDicts;
                notesFname = common_all_1.NoteFnameDictUtils.merge(notesFname, notesByFname);
                this.logger.info({
                    ctx,
                    vault,
                    numEntries: lodash_1.default.size(notesById),
                    numCacheUpdates: notesCache.numCacheMisses,
                });
                return notesById;
            }
            return {};
        }));
        const allNotes = Object.assign({}, ...allNotesList);
        const notesWithLinks = lodash_1.default.filter(allNotes, (note) => !lodash_1.default.isEmpty(note.links));
        this.addBacklinks({
            notesById: allNotes,
            notesByFname: notesFname,
        }, notesWithLinks);
        const duration = (0, common_server_1.getDurationMilliseconds)(start);
        this.logger.info({ ctx, msg: `time to init notes: "${duration}" ms` });
        return {
            data: {
                notesById: allNotes,
                notesByFname: notesFname,
            },
            error: errors.length === 0 ? undefined : new common_all_1.DendronCompositeError(errors),
        };
    }
    createRenderedCache(config) {
        const ctx = "createRenderedCache";
        const maxPreviewsCached = common_all_1.ConfigUtils.getWorkspace(config).maxPreviewsCached;
        if (maxPreviewsCached && maxPreviewsCached > 0) {
            this.logger.info({
                ctx,
                msg: `Creating rendered preview cache set to hold maximum of '${config.workspace.maxPreviewsCached}' items.`,
            });
            return new common_all_1.LruCache({ maxItems: maxPreviewsCached });
        }
        else {
            // This is most likely to happen if the user were to set incorrect configuration
            // value for maxPreviewsCached, we don't want to crash initialization due to
            // not being able to cache previews. Hence we will log an error and not use
            // the preview cache.
            this.logger.error({
                ctx,
                msg: `Did not find valid maxPreviewsCached (value was '${maxPreviewsCached}')
          in configuration. When specified th value must be a number greater than 0. Using null cache.`,
            });
            return new common_all_1.NullCache();
        }
    }
    /**
     * Create and add backlinks from all notes with a link pointing to another note
     */
    addBacklinks(noteDicts, notesWithLinks) {
        notesWithLinks.forEach((noteFrom) => {
            try {
                noteFrom.links.forEach((link) => {
                    const maybeBacklink = common_all_1.BacklinkUtils.createFromDLink(link);
                    if (maybeBacklink) {
                        const notes = common_all_1.NoteDictsUtils.findByFname({
                            fname: link.to.fname,
                            noteDicts,
                            skipCloneDeep: true,
                        });
                        notes.forEach((noteTo) => {
                            common_all_1.BacklinkUtils.addBacklinkInPlace({
                                note: noteTo,
                                backlink: maybeBacklink,
                            });
                        });
                    }
                });
            }
            catch (err) {
                const error = (0, common_all_1.error2PlainObject)(err);
                this.logger.error({ error, noteFrom, message: "issue with backlinks" });
            }
        });
    }
    /**
     * Recursively search through fname to find next available ancestor note.
     *
     * E.g, if fpath = "baz.foo.bar", search for "baz.foo", then "baz", then "root" until first valid note is found
     * @param fpath of note to find ancestor of
     * @param vault of ancestor note
     * @returns closest ancestor note
     */
    async findClosestAncestor(fpath, vault) {
        const dirname = common_all_1.DNodeUtils.dirName(fpath);
        // Reached the end, must be root note
        if (dirname === "") {
            const rootResp = await this._noteStore.find({ fname: "root", vault });
            if (rootResp.error || rootResp.data.length === 0) {
                return {
                    error: common_all_1.DendronError.createFromStatus({
                        status: common_all_1.ERROR_STATUS.NO_ROOT_NOTE_FOUND,
                        message: `No root found for ${fpath}.`,
                        innerError: rootResp.error,
                        severity: common_all_1.ERROR_SEVERITY.MINOR,
                    }),
                };
            }
            return { data: rootResp.data[0] };
        }
        const parentResp = await this._noteStore.find({ fname: dirname, vault });
        if (parentResp.data && parentResp.data.length > 0) {
            return { data: parentResp.data[0] };
        }
        else {
            return this.findClosestAncestor(dirname, vault);
        }
    }
    /**
     * Update the links inside this note that need to be updated for the rename
     * from `oldLoc` to `newLoc` Will update the note in place and return note if
     * something has changed
     */
    processNoteChangedByRename({ note, oldLoc, newLoc, config, }) {
        const prevNote = lodash_1.default.cloneDeep(note);
        const foundLinks = unified_1.LinkUtils.findLinksFromBody({
            note,
            filter: { loc: oldLoc },
            config,
        });
        // important to order by position since we replace links and this affects
        // subsequent links
        let allLinks = lodash_1.default.orderBy(foundLinks, (link) => {
            var _a;
            return (_a = link.position) === null || _a === void 0 ? void 0 : _a.start.offset;
        }, "desc");
        // perform header updates as needed
        if (oldLoc.fname.toLowerCase() === newLoc.fname.toLowerCase() &&
            oldLoc.vaultName === newLoc.vaultName &&
            oldLoc.anchorHeader &&
            newLoc.anchorHeader) {
            // Renaming the header, only update links that link to the old header
            allLinks = lodash_1.default.filter(allLinks, (link) => {
                var _a, _b;
                // This is a wikilink to this header
                if (((_a = link.to) === null || _a === void 0 ? void 0 : _a.anchorHeader) === oldLoc.anchorHeader)
                    return true;
                // Or this is a range reference, and one part of the range includes this header
                return (link.type === "ref" &&
                    (0, common_all_1.isNotUndefined)(oldLoc.anchorHeader) &&
                    this.referenceRangeParts((_b = link.to) === null || _b === void 0 ? void 0 : _b.anchorHeader).includes(oldLoc.anchorHeader));
            });
        }
        // filter all links for following criteria:
        // - only modify links that have same _to_ vault name
        // - explicitly same: has vault prefix
        // - implicitly same: to.vaultName is undefined, but link is in a note that's in the vault.
        allLinks = allLinks.filter((link) => {
            var _a, _b;
            const oldLocVaultName = oldLoc.vaultName;
            const explicitlySameVault = ((_a = link.to) === null || _a === void 0 ? void 0 : _a.vaultName) === oldLocVaultName;
            const oldLocVault = common_all_1.VaultUtils.getVaultByName({
                vaults: this.vaults,
                vname: oldLocVaultName,
            });
            const implicitlySameVault = lodash_1.default.isUndefined((_b = link.to) === null || _b === void 0 ? void 0 : _b.vaultName) && lodash_1.default.isEqual(note.vault, oldLocVault);
            return explicitlySameVault || implicitlySameVault;
        });
        // perform link substitution
        lodash_1.default.reduce(allLinks, (note, link) => {
            var _a;
            const oldLink = unified_1.LinkUtils.dlink2DNoteLink(link);
            // current implementation adds alias for all notes
            // check if old note has alias thats different from its fname
            let alias;
            if (oldLink.from.alias && oldLink.from.alias !== oldLink.from.fname) {
                alias = oldLink.from.alias;
                // Update the alias if it was using the default alias.
                if (((_a = oldLoc.alias) === null || _a === void 0 ? void 0 : _a.toLocaleLowerCase()) ===
                    oldLink.from.alias.toLocaleLowerCase() &&
                    newLoc.alias) {
                    alias = newLoc.alias;
                }
            }
            // for hashtag links, we'll have to regenerate the alias
            if (newLoc.fname.startsWith(common_all_1.TAGS_HIERARCHY)) {
                const fnameWithoutTag = newLoc.fname.slice(common_all_1.TAGS_HIERARCHY.length);
                // Frontmatter tags don't have the hashtag
                if (link.type !== "frontmatterTag")
                    alias = `#${fnameWithoutTag}`;
                else
                    alias = fnameWithoutTag;
            }
            else if (oldLink.from.fname.startsWith(common_all_1.TAGS_HIERARCHY)) {
                // If this used to be a hashtag but no longer is, the alias is like `#foo.bar` and no longer makes sense.
                // And if this used to be a frontmatter tag, the alias being undefined will force it to be removed because a frontmatter tag can't point to something outside of tags hierarchy.
                alias = undefined;
            }
            // for user tag links, we'll have to regenerate the alias.
            // added link.type !==ref check because syntax like !@john doesn't work as a note ref
            if (link.type !== "ref" && newLoc.fname.startsWith(common_all_1.USERS_HIERARCHY)) {
                const fnameWithoutTag = newLoc.fname.slice(common_all_1.USERS_HIERARCHY.length);
                alias = `@${fnameWithoutTag}`;
            }
            else if (oldLink.from.fname.startsWith(common_all_1.USERS_HIERARCHY)) {
                // If this used to be a user tag but no longer is, the alias is like `@foo.bar` and no longer makes sense.
                alias = undefined;
            }
            // Correctly handle header renames in references with range based references
            if (oldLoc.anchorHeader &&
                link.type === "ref" &&
                (0, common_all_1.isNotUndefined)(oldLink.from.anchorHeader) &&
                oldLink.from.anchorHeader.indexOf(":") > -1 &&
                (0, common_all_1.isNotUndefined)(newLoc.anchorHeader) &&
                newLoc.anchorHeader.indexOf(":") === -1) {
                // This is a reference, old anchor had a ":" in it, a new anchor header is provided and does not have ":" in it.
                // For example, `![[foo#start:#end]]` to `![[foo#something]]`. In this case, `something` is actually supposed to replace only one part of the range.
                // Find the part that matches the old header, and replace just that with the new one.
                let [start, end] = this.referenceRangeParts(oldLink.from.anchorHeader);
                if (start === oldLoc.anchorHeader)
                    start = newLoc.anchorHeader;
                if (end === oldLoc.anchorHeader)
                    end = newLoc.anchorHeader;
                newLoc.anchorHeader = `${start}:#${end}`;
            }
            const newBody = unified_1.LinkUtils.updateLink({
                note,
                oldLink,
                newLink: {
                    ...oldLink,
                    from: {
                        ...newLoc,
                        anchorHeader: newLoc.anchorHeader || oldLink.from.anchorHeader,
                        alias,
                    },
                },
            });
            note.body = newBody;
            return note;
        }, note);
        if (prevNote.body === note.body && prevNote.tags === note.tags) {
            return;
        }
        else {
            return note;
        }
    }
    referenceRangeParts(anchorHeader) {
        if (!anchorHeader || anchorHeader.indexOf(":") === -1)
            return [];
        let [start, end] = anchorHeader.split(":");
        start = start.replace(/^#*/, "");
        end = end.replace(/^#*/, "");
        return [start, end];
    }
    async isCachedPreviewUpToDate(cachedPreview, note) {
        // Most of the times the preview is going to be invalidated by users making changes to
        // the note itself, hence before going through the trouble of checking whether linked
        // reference notes have been updated we should do the super cheap check to see
        // whether the note itself has invalidated the preview.
        if (note.contentHash !== cachedPreview.contentHash) {
            return false;
        }
        // TODO: Add another check to see if backlinks have changed
        const visitedIds = new Set();
        return this._isCachedPreviewUpToDate({
            note,
            visitedIds,
            latestUpdated: cachedPreview.updated,
        });
    }
    /**
     * Check if there exists a note reference that is newer than the provided "latestUpdated"
     * This is used to determine if a cached preview is up-to-date
     *
     * Preview note tree includes links whose content is rendered in the rootNote preview,
     * particularly the reference links (![[ref-link-example]]).
     */
    async _isCachedPreviewUpToDate({ note, latestUpdated, visitedIds, }) {
        if (note.updated > latestUpdated) {
            return false;
        }
        // Mark the visited nodes so we don't end up recursively spinning if there
        // are cycles in our preview tree such as [[foo]] -> [[!bar]] -> [[!foo]]
        if (visitedIds.has(note.id)) {
            return true;
        }
        else {
            visitedIds.add(note.id);
        }
        const linkedRefNotes = await Promise.all(note.links
            .filter((link) => link.type === "ref")
            .filter((link) => link.to && link.to.fname)
            .map(async (link) => {
            const pointTo = link.to;
            // When there is a vault specified in the link we want to respect that
            // specification, otherwise we will map by just the file name.
            const maybeVault = pointTo.vaultName
                ? common_all_1.VaultUtils.getVaultByName({
                    vname: pointTo.vaultName,
                    vaults: this.vaults,
                })
                : undefined;
            return (await this.findNotesMeta({
                fname: pointTo.fname,
                vault: maybeVault,
            }))[0];
        }));
        for (const linkedNote of linkedRefNotes) {
            // Recurse into each child reference linked note.
            if (
            // eslint-disable-next-line no-await-in-loop
            !(await this._isCachedPreviewUpToDate({
                note: linkedNote,
                visitedIds,
                latestUpdated,
            }))) {
                return false;
            }
        }
        return true;
    }
    async _renderNote({ note, flavor, dest, }) {
        let proc;
        const { data: config } = common_server_1.DConfig.readConfigAndApplyLocalOverrideSync(this.wsRoot);
        const noteCacheForRenderDict = await (0, unified_1.getParsingDependencyDicts)(note, this, config, this.vaults);
        if (dest === common_all_1.DendronASTDest.HTML) {
            proc = unified_1.MDUtilsV5.procRehypeFull({
                noteToRender: note,
                noteCacheForRenderDict,
                fname: note.fname,
                vault: note.vault,
                config,
                vaults: this.vaults,
                wsRoot: this.wsRoot,
            }, { flavor });
        }
        else {
            proc = unified_1.MDUtilsV5.procRemarkFull({
                noteToRender: note,
                noteCacheForRenderDict,
                fname: note.fname,
                vault: note.vault,
                dest,
                config,
                vaults: this.vaults,
                wsRoot: this.wsRoot,
            }, { flavor });
        }
        const payload = await proc.process(common_all_1.NoteUtils.serialize(note));
        const renderedNote = payload.toString();
        return renderedNote;
    }
    updateNotesWithLinkCandidates(noteDicts, maxNoteLength, config) {
        return lodash_1.default.map(noteDicts.notesById, (noteFrom) => {
            try {
                if (noteFrom.body.length <
                    (maxNoteLength || common_all_1.CONSTANTS.DENDRON_DEFAULT_MAX_NOTE_LENGTH)) {
                    const linkCandidates = unified_1.LinkUtils.findLinkCandidatesSync({
                        note: noteFrom,
                        noteDicts,
                        config,
                    });
                    noteFrom.links = noteFrom.links.concat(linkCandidates);
                }
            }
            catch (err) {
                const error = (0, common_all_1.error2PlainObject)(err);
                this.logger.error({
                    error,
                    noteFrom,
                    message: "issue with link candidates",
                });
                return;
            }
        });
    }
}
exports.DendronEngineV3 = DendronEngineV3;
const createEngineV3 = ({ wsRoot }) => {
    const engine = DendronEngineV3.create({ wsRoot });
    return engine;
};
exports.createEngineV3 = createEngineV3;
//# sourceMappingURL=DendronEngineV3.js.map