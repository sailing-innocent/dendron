"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EngineV3Base = void 0;
/* eslint-disable no-useless-constructor */
/* eslint-disable no-empty-function */
const lodash_1 = __importDefault(require("lodash"));
const BacklinkUtils_1 = require("../BacklinkUtils");
const constants_1 = require("../constants");
const dnode_1 = require("../dnode");
const error_1 = require("../error");
const utils_1 = require("../utils");
const vault_1 = require("../vault");
/**
 * Abstract base class that contains common logic between DendronEngineV3 and
 * DendronEngineV3Web
 */
class EngineV3Base {
    constructor(opts) {
        this.noteStore = opts.noteStore;
        this.logger = opts.logger;
        this.vaults = opts.vaults;
        this.wsRoot = opts.wsRoot;
    }
    /**
     * See {@link DEngine.getNote}
     */
    async getNote(id) {
        return this.noteStore.get(id);
    }
    /**
     * See {@link DEngine.getNoteMeta}
     */
    async getNoteMeta(id) {
        return this.noteStore.getMetadata(id);
    }
    /**
     * See {@link DEngine.bulkGetNotes}
     */
    async bulkGetNotes(ids) {
        if (!ids || ids.length === 0) {
            return {
                data: [],
            };
        }
        const bulkResponses = await this.noteStore.bulkGet(ids);
        const errors = bulkResponses
            .flatMap((response) => response.error)
            .filter(utils_1.isNotUndefined);
        return {
            error: errors.length > 0 ? new error_1.DendronCompositeError(errors) : undefined,
            data: bulkResponses
                .flatMap((response) => response.data)
                .filter(utils_1.isNotUndefined),
        };
    }
    /**
     * See {@link DEngine.bulkGetNotesMeta}
     */
    async bulkGetNotesMeta(ids) {
        if (!ids || ids.length === 0) {
            return {
                data: [],
            };
        }
        const bulkResponses = await this.noteStore.bulkGetMetadata(ids);
        const errors = bulkResponses
            .flatMap((response) => response.error)
            .filter(utils_1.isNotUndefined);
        return {
            error: errors.length > 0 ? new error_1.DendronCompositeError(errors) : undefined,
            data: bulkResponses
                .flatMap((response) => response.data)
                .filter(utils_1.isNotUndefined),
        };
    }
    /**
     * See {@link DEngine.findNotes}
     */
    async findNotes(opts) {
        const resp = await this.noteStore.find(opts);
        return resp.data ? resp.data : [];
    }
    /**
     * See {@link DEngine.findNotesMeta}
     */
    async findNotesMeta(opts) {
        const resp = await this.noteStore.findMetaData(opts);
        return resp.data ? resp.data : [];
    }
    /**
     * See {@link DEngine.bulkWriteNotes}
     */
    async bulkWriteNotes(opts) {
        const writeResponses = await Promise.all(opts.notes.map((note) => this.writeNote(note, opts.opts)));
        const errors = writeResponses
            .flatMap((response) => response.error)
            .filter(utils_1.isNotUndefined);
        return {
            error: errors.length > 0 ? new error_1.DendronCompositeError(errors) : undefined,
            data: writeResponses
                .flatMap((response) => response.data)
                .filter(utils_1.isNotUndefined),
        };
    }
    /**
     * See {@link DEngine.deleteNote}
     */
    async deleteNote(id, opts) {
        const ctx = "DEngine:deleteNote";
        if (id === "root") {
            throw new error_1.DendronError({
                message: "",
                status: constants_1.ERROR_STATUS.CANT_DELETE_ROOT,
            });
        }
        let changes = [];
        const resp = await this.noteStore.getMetadata(id);
        if (resp.error) {
            return {
                error: new error_1.DendronError({
                    status: constants_1.ERROR_STATUS.DOES_NOT_EXIST,
                    message: `Unable to delete ${id}: Note does not exist`,
                }),
            };
        }
        // Temp solution to get around current restrictions where NoteChangeEntry needs a NoteProp
        const noteToDelete = lodash_1.default.merge(resp.data, {
            body: "",
        });
        this.logger.info({ ctx, noteToDelete, opts, id });
        const noteAsLog = dnode_1.NoteUtils.toLogObj(noteToDelete);
        if (!noteToDelete.parent) {
            return {
                error: new error_1.DendronError({
                    status: constants_1.ERROR_STATUS.NO_PARENT_FOR_NOTE,
                    message: `No parent found for ${noteToDelete.fname}`,
                }),
            };
        }
        const parentResp = await this.noteStore.get(noteToDelete.parent);
        if (parentResp.error) {
            return {
                error: new error_1.DendronError({
                    status: constants_1.ERROR_STATUS.NO_PARENT_FOR_NOTE,
                    message: `Unable to delete ${noteToDelete.fname}: Note's parent does not exist in engine: ${noteToDelete.parent}`,
                    innerError: parentResp.error,
                }),
            };
        }
        let parentNote = parentResp.data;
        let prevNote = { ...noteToDelete };
        // If deleted note has children, create stub note with a new id in metadata store
        if (!lodash_1.default.isEmpty(noteToDelete.children)) {
            this.logger.info({ ctx, noteAsLog, msg: "keep as stub" });
            const replacingStub = dnode_1.NoteUtils.create({
                // the replacing stub should not keep the old note's body, id, and links.
                // otherwise, it will be captured while processing links and will
                // fail because this note is not actually in the file system.
                ...lodash_1.default.omit(noteToDelete, ["id", "links", "body"]),
                stub: true,
            });
            dnode_1.DNodeUtils.addChild(parentNote, replacingStub);
            // Move children to new note
            changes = changes.concat(await this.updateChildrenWithNewParent(noteToDelete, replacingStub));
            changes.push({ note: replacingStub, status: "create" });
        }
        else {
            // If parent is a stub, go upwards up the tree and delete rest of stubs
            while (parentNote.stub) {
                changes.push({ note: parentNote, status: "delete" });
                if (!parentNote.parent) {
                    return {
                        error: new error_1.DendronError({
                            status: constants_1.ERROR_STATUS.NO_PARENT_FOR_NOTE,
                            message: `No parent found for ${parentNote.fname}`,
                        }),
                    };
                }
                // eslint-disable-next-line no-await-in-loop
                const parentResp = await this.noteStore.get(parentNote.parent);
                if (parentResp.data) {
                    prevNote = { ...parentNote };
                    parentNote = parentResp.data;
                }
                else {
                    return {
                        error: new error_1.DendronError({
                            status: constants_1.ERROR_STATUS.NO_PARENT_FOR_NOTE,
                            message: `Unable to delete ${noteToDelete.fname}: Note ${parentNote === null || parentNote === void 0 ? void 0 : parentNote.fname}'s parent does not exist in engine: ${parentNote.parent}`,
                        }),
                    };
                }
            }
        }
        // Delete note reference from parent's child
        const parentNotePrev = { ...parentNote };
        this.logger.info({ ctx, noteAsLog, msg: "delete from parent" });
        dnode_1.DNodeUtils.removeChild(parentNote, prevNote);
        // Add an entry for the updated parent
        changes.push({
            prevNote: parentNotePrev,
            note: parentNote,
            status: "update",
        });
        const deleteResp = (opts === null || opts === void 0 ? void 0 : opts.metaOnly)
            ? await this.noteStore.deleteMetadata(id)
            : await this.noteStore.delete(id);
        if (deleteResp.error) {
            return {
                error: new error_1.DendronError({
                    message: `Unable to delete note ${id}`,
                    severity: constants_1.ERROR_SEVERITY.MINOR,
                    payload: deleteResp.error,
                }),
            };
        }
        // Remove backlinks if applicable
        const backlinkChanges = await Promise.all(noteToDelete.links.map((link) => this.removeBacklink(link)));
        changes = changes.concat(backlinkChanges.flat());
        changes.push({ note: noteToDelete, status: "delete" });
        // Update metadata for all other changes
        await this.updateNoteMetadataStore(changes);
        this.logger.info({
            ctx,
            msg: "exit",
            changed: changes.map((n) => dnode_1.NoteUtils.toLogObj(n.note)),
        });
        return {
            data: changes,
        };
    }
    async queryNotes(opts) {
        // const ctx = "Engine:queryNotes";
        const { vault } = opts;
        const MAX_LIMIT = 100;
        // Need to ignore this because the engine stringifies this property, so the types are incorrect.
        // @ts-ignore
        if ((vault === null || vault === void 0 ? void 0 : vault.selfContained) === "true" || (vault === null || vault === void 0 ? void 0 : vault.selfContained) === "false")
            vault.selfContained = vault.selfContained === "true";
        const response = await this.noteStore.queryMetadata(opts);
        if (response.isErr()) {
            // TODO: need to return an error
            return [];
        }
        let items = response.value;
        if (items.length === 0) {
            return [];
        }
        if (!lodash_1.default.isUndefined(vault)) {
            items = items.filter((ent) => {
                return vault_1.VaultUtils.isEqual(vault, ent.vault, this.wsRoot);
            });
        }
        // TODO: Support actual pagination if needed. For now, cap results
        if (items.length > MAX_LIMIT) {
            items = items.slice(0, MAX_LIMIT);
        }
        const notes = await this.noteStore.bulkGet(items.map((ent) => ent.id));
        const modifiedNotes = notes
            .filter((ent) => lodash_1.default.isUndefined(ent.error))
            .map((resp) => resp.data);
        return modifiedNotes;
    }
    /**
     * Move children of old parent note to new parent
     * @return note change entries of modified children
     */
    async updateChildrenWithNewParent(oldParent, newParent) {
        const changes = [];
        // Move existing note's children to new note
        const childrenResp = await this.noteStore.bulkGet(oldParent.children);
        childrenResp.forEach((child) => {
            if (child.data) {
                const childNote = child.data;
                const prevChildNoteState = { ...childNote };
                dnode_1.DNodeUtils.addChild(newParent, childNote);
                // Add one entry for each child updated
                changes.push({
                    prevNote: prevChildNoteState,
                    note: childNote,
                    status: "update",
                });
            }
        });
        return changes;
    }
    /**
     * Update note metadata store based on note change entries
     * @param changes entries to update
     * @returns
     */
    async updateNoteMetadataStore(changes) {
        return Promise.all(changes.map((change) => {
            switch (change.status) {
                case "delete": {
                    return this.noteStore.deleteMetadata(change.note.id);
                }
                case "create":
                case "update": {
                    return this.noteStore.writeMetadata({
                        key: change.note.id,
                        noteMeta: change.note,
                    });
                }
                default:
                    return { data: "" };
            }
        }));
    }
    /**
     * Create backlink from given link that references another note (denoted by presence of link.to field)
     * and add that backlink to referenced note's links
     *
     * @param link Link potentionally referencing another note
     */
    async addBacklink(link) {
        var _a, _b, _c;
        if (!((_a = link.to) === null || _a === void 0 ? void 0 : _a.fname)) {
            return [];
        }
        const maybeBacklink = BacklinkUtils_1.BacklinkUtils.createFromDLink(link);
        if (maybeBacklink) {
            const maybeVault = ((_b = link.to) === null || _b === void 0 ? void 0 : _b.vaultName)
                ? vault_1.VaultUtils.getVaultByName({
                    vname: (_c = link.to) === null || _c === void 0 ? void 0 : _c.vaultName,
                    vaults: this.vaults,
                })
                : undefined;
            const notes = await this.noteStore.find({
                fname: link.to.fname,
                vault: maybeVault,
            });
            if (notes.data) {
                return Promise.all(notes.data.map(async (note) => {
                    const prevNote = lodash_1.default.cloneDeep(note);
                    BacklinkUtils_1.BacklinkUtils.addBacklinkInPlace({ note, backlink: maybeBacklink });
                    return {
                        prevNote,
                        note,
                        status: "update",
                    };
                }));
            }
        }
        return [];
    }
    /**
     * Remove backlink associated with given link that references another note (denoted by presence of link.to field)
     * from that referenced note
     *
     * @param link Link potentially referencing another note
     */
    async removeBacklink(link) {
        var _a, _b, _c;
        if (!((_a = link.to) === null || _a === void 0 ? void 0 : _a.fname)) {
            return [];
        }
        const maybeBacklink = BacklinkUtils_1.BacklinkUtils.createFromDLink(link);
        if (maybeBacklink) {
            const maybeVault = ((_b = link.to) === null || _b === void 0 ? void 0 : _b.vaultName)
                ? vault_1.VaultUtils.getVaultByName({
                    vname: (_c = link.to) === null || _c === void 0 ? void 0 : _c.vaultName,
                    vaults: this.vaults,
                })
                : undefined;
            const notes = await this.noteStore.find({
                fname: link.to.fname,
                vault: maybeVault,
            });
            if (notes.data) {
                return Promise.all(notes.data.map(async (note) => {
                    const prevNote = lodash_1.default.cloneDeep(note);
                    BacklinkUtils_1.BacklinkUtils.removeBacklinkInPlace({
                        note,
                        backlink: maybeBacklink,
                    });
                    return {
                        prevNote,
                        note,
                        status: "update",
                    };
                }));
            }
        }
        return [];
    }
}
exports.EngineV3Base = EngineV3Base;
//# sourceMappingURL=EngineV3Base.js.map