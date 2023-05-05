"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoteStore = void 0;
const lodash_1 = __importDefault(require("lodash"));
const vscode_uri_1 = require("vscode-uri");
const constants_1 = require("../constants");
const dnode_1 = require("../dnode");
const error_1 = require("../error");
const utils_1 = require("../utils");
const vault_1 = require("../vault");
/**
 * Responsible for storing NoteProps non-metadata and NoteProps metadata
 */
class NoteStore {
    constructor(fileStore, dataStore, wsRoot) {
        this._fileStore = fileStore;
        this._metadataStore = dataStore;
        this._wsRoot = wsRoot;
    }
    dispose() {
        this._metadataStore.dispose();
    }
    /**
     * See {@link INoteStore.get}
     */
    async get(key) {
        const metadata = await this.getMetadata(key);
        if (metadata.error) {
            return { error: metadata.error };
        }
        // If note is a stub, return stub note
        if (metadata.data.stub) {
            return {
                data: { ...metadata.data, body: "" },
            };
        }
        // vault.fsPath that comes from local overrides can be absolute paths (e.g. if scope is global).
        // need to slice the absolute portion off to correctly resolve.
        // if a relative path comes in, this will do nothing and work as intended
        const processedVault = metadata.data.vault.fsPath.startsWith(this._wsRoot.fsPath)
            ? {
                ...metadata.data.vault,
                fsPath: metadata.data.vault.fsPath.slice(this._wsRoot.fsPath.length),
            }
            : metadata.data.vault;
        const uri = vscode_uri_1.Utils.joinPath(this._wsRoot, vault_1.VaultUtils.getRelPath({
            ...processedVault,
        }), metadata.data.fname + ".md");
        const nonMetadata = await this._fileStore.read(uri);
        if (nonMetadata.error) {
            return { error: nonMetadata.error };
        }
        // Parse file for note body since we don't have that in metadata
        const capture = nonMetadata.data.match(/^---[\s\S]+?---/);
        if (capture) {
            const offset = capture[0].length;
            const body = nonMetadata.data.slice(offset + 1);
            const note = {
                ...metadata.data,
                body,
            };
            return { data: note };
        }
        else {
            return {
                error: error_1.DendronError.createFromStatus({
                    status: constants_1.ERROR_STATUS.BAD_PARSE_FOR_NOTE,
                    message: `Frontmatter missing for file ${uri.fsPath} associated with note ${key}.`,
                    severity: constants_1.ERROR_SEVERITY.MINOR,
                }),
            };
        }
    }
    /**
     * See {@link INoteStore.bulkGet}
     */
    async bulkGet(keys) {
        return Promise.all(keys.map((key) => this.get(key)));
    }
    /**
     * See {@link INoteStore.getMetadata}
     */
    async getMetadata(key) {
        return this._metadataStore.get(key);
    }
    /**
     * See {@link INoteStore.bulkGetMetadata}
     */
    async bulkGetMetadata(keys) {
        return Promise.all(keys.map((key) => this.getMetadata(key)));
    }
    /**
     * See {@link INoteStore.find}
     */
    async find(opts) {
        const noteMetadata = await this.findMetaData(opts);
        if (noteMetadata.error) {
            return { error: noteMetadata.error };
        }
        const responses = await Promise.all(noteMetadata.data.map((noteMetadata) => this.get(noteMetadata.id)));
        return {
            data: responses.map((resp) => resp.data).filter(utils_1.isNotUndefined),
        };
    }
    /**
     * See {@link INoteStore.findMetaData}
     */
    async findMetaData(opts) {
        return this._metadataStore.find(opts);
    }
    /**
     * See {@link INoteStore.write}
     */
    async write(opts) {
        const { key, note } = opts;
        const notePropsMeta = lodash_1.default.omit(note, ["body"]);
        const content = dnode_1.NoteUtils.serialize(note);
        const noteMeta = {
            ...notePropsMeta,
            contentHash: (0, utils_1.genHash)(content),
        };
        const metaResp = await this.writeMetadata({ key, noteMeta });
        if (metaResp.error) {
            return { error: metaResp.error };
        }
        // If note is a stub, do not write to file
        if (!noteMeta.stub) {
            const uri = vscode_uri_1.Utils.joinPath(this._wsRoot, vault_1.VaultUtils.getRelPath(note.vault), note.fname + ".md");
            const writeResp = await this._fileStore.write(uri, content);
            if (writeResp.error) {
                return { error: writeResp.error };
            }
        }
        return { data: key };
    }
    /**s
     * See {@link INoteStore.writeMetadata}
     */
    async writeMetadata(opts) {
        const { key, noteMeta } = opts;
        // Ids don't match, return error
        if (key !== noteMeta.id) {
            return {
                error: error_1.DendronError.createFromStatus({
                    status: constants_1.ERROR_STATUS.WRITE_FAILED,
                    message: `Ids don't match between key ${key} and note meta ${noteMeta}.`,
                    severity: constants_1.ERROR_SEVERITY.MINOR,
                }),
            };
        }
        return this._metadataStore.write(key, noteMeta);
    }
    /**
     * See {@link INoteStore.bulkWriteMetadata}
     */
    async bulkWriteMetadata(opts) {
        return Promise.all(opts.map((writeMetaOpt) => {
            return this.writeMetadata(writeMetaOpt);
        }));
    }
    /**
     * See {@link INoteStore.delete}
     */
    async delete(key) {
        const metadata = await this.getMetadata(key);
        if (metadata.error) {
            return { error: metadata.error };
        }
        const resp = await this.deleteMetadata(key);
        if (resp.error) {
            return { error: resp.error };
        }
        // If note is a stub, do not delete from file store since it won't exist
        if (!metadata.data.stub) {
            const uri = vscode_uri_1.Utils.joinPath(this._wsRoot, vault_1.VaultUtils.getRelPath(metadata.data.vault), metadata.data.fname + ".md");
            const deleteResp = await this._fileStore.delete(uri);
            if (deleteResp.error) {
                return { error: deleteResp.error };
            }
        }
        return { data: key };
    }
    /**
     * See {@link INoteStore.deleteMetadata}
     */
    async deleteMetadata(key) {
        const metadata = await this.getMetadata(key);
        if (metadata.error) {
            return { error: metadata.error };
        }
        else if (metadata.data.fname === "root") {
            return {
                error: error_1.DendronError.createFromStatus({
                    status: constants_1.ERROR_STATUS.CANT_DELETE_ROOT,
                    message: `Cannot delete ${key}. Root notes cannot be deleted.`,
                    severity: constants_1.ERROR_SEVERITY.MINOR,
                }),
            };
        }
        return this._metadataStore.delete(key);
    }
    async rename(oldLoc, newLoc) {
        // TODO: implement
        const test = oldLoc.fname + newLoc.fname;
        return { data: test };
    }
    /**
     * See {@link INoteStore.queryMetadata}
     */
    queryMetadata(opts) {
        return this._metadataStore.query(opts);
    }
}
exports.NoteStore = NoteStore;
//# sourceMappingURL=NoteStore.js.map