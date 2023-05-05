"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoteMetadataStore = void 0;
const lodash_1 = __importDefault(require("lodash"));
const constants_1 = require("../constants");
const error_1 = require("../error");
const noteDictsUtils_1 = require("../noteDictsUtils");
const utils_1 = require("../utils");
const vault_1 = require("../vault");
class NoteMetadataStore {
    constructor(fuseEngine) {
        this._noteMetadataById = {};
        this._noteIdsByFname = {};
        this._fuseEngine = fuseEngine;
    }
    dispose() {
        this._noteMetadataById = {};
        this._noteIdsByFname = {};
        this._fuseEngine.replaceNotesIndex({});
    }
    /**
     * See {@link IDataStore.get}
     */
    async get(key) {
        const maybeNote = this._noteMetadataById[key];
        if (maybeNote) {
            return { data: lodash_1.default.cloneDeep(maybeNote) };
        }
        else {
            return {
                error: error_1.DendronError.createFromStatus({
                    status: constants_1.ERROR_STATUS.CONTENT_NOT_FOUND,
                    message: `NoteProps metadata not found for key ${key}.`,
                    severity: constants_1.ERROR_SEVERITY.MINOR,
                }),
            };
        }
    }
    /**
     * See {@link IDataStore.find}
     */
    async find(opts) {
        const { fname, vault, excludeStub } = opts;
        if (!fname && !vault && lodash_1.default.isUndefined(excludeStub)) {
            return { data: [] };
        }
        let noteMetadata;
        if (fname) {
            const cleanedFname = (0, utils_1.cleanName)(fname);
            const ids = this._noteIdsByFname[cleanedFname];
            if (!ids) {
                return { data: [] };
            }
            noteMetadata = ids
                .map((id) => this._noteMetadataById[id])
                .filter(utils_1.isNotUndefined);
        }
        else {
            noteMetadata = lodash_1.default.values(this._noteMetadataById);
        }
        if (vault) {
            // Need to ignore this because the engine stringifies this property, so the types are incorrect.
            // @ts-ignore
            if ((vault === null || vault === void 0 ? void 0 : vault.selfContained) === "true" || (vault === null || vault === void 0 ? void 0 : vault.selfContained) === "false") {
                vault.selfContained = vault.selfContained === "true";
            }
            noteMetadata = noteMetadata.filter((note) => vault_1.VaultUtils.isEqualV2(note.vault, vault));
        }
        if (excludeStub) {
            noteMetadata = noteMetadata.filter((note) => note.stub !== true);
        }
        return { data: lodash_1.default.cloneDeep(noteMetadata) };
    }
    /**
     * See {@link IDataStore.write}
     *
     * Add note to _noteMetadataById and _noteIdsByFname.
     * If note id already exists, check to see if it corresponds to same note by fname.
     * If fname match, then we only need to update _noteMetadataById. If fname doesn't match, remove old id from _noteIdsByFname first before updating both.
     *
     * Otherwise, if note id doesn't exist, add to both dictionaries
     */
    async write(key, data) {
        const maybeNote = this._noteMetadataById[data.id];
        if (maybeNote) {
            // Fuse has no update. Must remove first
            this._fuseEngine.removeNoteFromIndex(maybeNote);
            if ((0, utils_1.cleanName)(maybeNote.fname) === (0, utils_1.cleanName)(data.fname)) {
                this._fuseEngine.addNoteToIndex(data);
                this._noteMetadataById[data.id] = data;
                return { data: key };
            }
            else {
                // Remove old fname from fname dict
                noteDictsUtils_1.NoteFnameDictUtils.delete(maybeNote, this._noteIdsByFname);
            }
        }
        this._noteMetadataById[data.id] = data;
        noteDictsUtils_1.NoteFnameDictUtils.add(data, this._noteIdsByFname);
        this._fuseEngine.addNoteToIndex(data);
        return { data: key };
    }
    /**
     * See {@link IDataStore.delete}
     *
     * Remove note from both _noteMetadataById and _noteIdsByFname.
     */
    async delete(key) {
        const maybeNote = this._noteMetadataById[key];
        if (maybeNote) {
            noteDictsUtils_1.NoteFnameDictUtils.delete(maybeNote, this._noteIdsByFname);
            this._fuseEngine.removeNoteFromIndex(maybeNote);
        }
        delete this._noteMetadataById[key];
        return { data: key };
    }
    /**
     * See {@link IDataStore.query}
     */
    query(opts) {
        const items = this._fuseEngine.queryNote({
            ...opts,
        });
        return utils_1.ResultAsync.fromSafePromise(Promise.resolve(items));
    }
}
exports.NoteMetadataStore = NoteMetadataStore;
//# sourceMappingURL=NoteMetadataStore.js.map