"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GDocImportPod = void 0;
const basev3_1 = require("../basev3");
const utils_1 = require("../utils");
const axios_1 = __importDefault(require("axios"));
const lodash_1 = __importDefault(require("lodash"));
const common_all_1 = require("@dendronhq/common-all");
const path_1 = __importDefault(require("path"));
const common_server_1 = require("@dendronhq/common-server");
const engine_server_1 = require("@dendronhq/engine-server");
const ID = "dendron.gdoc";
var ErrMsg;
(function (ErrMsg) {
    ErrMsg["TIMEOUT"] = "timeout";
})(ErrMsg || (ErrMsg = {}));
class GDocImportPod extends basev3_1.ImportPod {
    constructor() {
        super(...arguments);
        /**
         * sends Request to drive API to get document id of the document name
         */
        this.getDocumentId = async (accessToken, documentName) => {
            var _a;
            const headers = {
                Authorization: `Bearer ${accessToken}`,
            };
            let response;
            try {
                const result = await axios_1.default.get(`https://www.googleapis.com/drive/v3/files`, {
                    params: {
                        q: `mimeType= 'application/vnd.google-apps.document' and name = '${documentName}'`,
                    },
                    headers,
                });
                response = (_a = result.data.files[0]) === null || _a === void 0 ? void 0 : _a.id;
            }
            catch (err) {
                throw new common_all_1.DendronError({ message: (0, common_all_1.stringifyError)(err) });
            }
            return response;
        };
        /**
         * sends request to drive API to fetch docs of mime type document
         */
        this.fetchDocListFromDrive = async (accessToken) => {
            const headers = {
                Authorization: `Bearer ${accessToken}`,
            };
            const result = await axios_1.default.get(`https://www.googleapis.com/drive/v3/files`, {
                params: {
                    q: "mimeType= 'application/vnd.google-apps.document'",
                },
                headers,
                timeout: 5000,
            });
            return result;
        };
        /**
         * gets all document List present in google docs and create HashMap of doc Id and Name
         */
        this.getAllDocuments = async (accessToken) => {
            let docIdsHashMap;
            let result;
            let error;
            try {
                result = await this.fetchDocListFromDrive(accessToken);
            }
            catch (err) {
                if (err.code === "ECONNABORTED") {
                    result = ErrMsg.TIMEOUT;
                }
                else {
                    throw new common_all_1.DendronError({ message: (0, common_all_1.stringifyError)(err) });
                }
            }
            if (result === ErrMsg.TIMEOUT) {
                error = ErrMsg.TIMEOUT;
            }
            else {
                const files = result === null || result === void 0 ? void 0 : result.data.files;
                //creates HashMap of documents with key as doc name and value as doc id
                files.forEach((file) => {
                    docIdsHashMap = {
                        ...docIdsHashMap,
                        [file.name]: file.id,
                    };
                });
            }
            return { docIdsHashMap, error };
        };
        /*
         * method to get data from google document
         */
        this.getDataFromGDoc = async (opts, config, assetDir) => {
            let response;
            const { documentId, accessToken, hierarchyDestination, importComments } = opts;
            const headers = {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            };
            try {
                const result = await axios_1.default.get(`https://docs.googleapis.com/v1/documents/${documentId}`, { headers });
                const markdown = utils_1.PodUtils.googleDocsToMarkdown(result.data, assetDir);
                response = {
                    body: markdown,
                    fname: `${hierarchyDestination}`,
                    custom: {
                        documentId: result.data.documentId,
                        revisionId: result.data.revisionId,
                        commentsUpdated: (importComments === null || importComments === void 0 ? void 0 : importComments.enable) || false,
                        ...config.frontmatter,
                    },
                };
            }
            catch (error) {
                this.L.error({
                    msg: "failed to import the doc",
                    payload: (0, common_all_1.stringifyError)(error),
                });
                throw new common_all_1.DendronError({ message: (0, common_all_1.stringifyError)(error) });
            }
            return response;
        };
        /*
         * method to get comments in document
         */
        this.getCommentsFromDoc = async (opts, response) => {
            var _a;
            let comments;
            const { documentId, accessToken, importComments } = opts;
            const headers = {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            };
            try {
                comments = await axios_1.default.get(`https://www.googleapis.com/drive/v2/files/${documentId}/comments`, { headers });
                const items = comments.data.items;
                if (items.length > 0) {
                    comments = items.map((item) => {
                        let replies;
                        if (item.replies.length > 0) {
                            replies = item.replies.map((reply) => {
                                reply = {
                                    author: reply.author.displayName,
                                    content: reply.content,
                                };
                                return reply;
                            });
                        }
                        item = {
                            author: item.author.displayName,
                            content: item.content,
                            replies,
                        };
                        return item;
                    });
                    if ((importComments === null || importComments === void 0 ? void 0 : importComments.format) === "text") {
                        comments = this.prettyComment(comments);
                    }
                    else {
                        comments = JSON.stringify(comments);
                    }
                    response.body = (_a = response.body) === null || _a === void 0 ? void 0 : _a.concat(`### Comments\n\n ${comments}`);
                }
            }
            catch (error) {
                this.L.error({
                    msg: "failed to import the comments",
                    payload: (0, common_all_1.stringifyError)(error),
                });
                throw new common_all_1.DendronError({ message: (0, common_all_1.stringifyError)(error) });
            }
            return response;
        };
        /*
         * method to prettify comment if format is text
         */
        this.prettyComment = (comments) => {
            let text = "";
            comments.forEach((comment) => {
                var _a;
                text += `- ${comment.author}:  ${comment.content}\n`;
                if (((_a = comment.replies) === null || _a === void 0 ? void 0 : _a.length) > 0) {
                    text += `\n\t replies to this comment: \n\n`;
                    comment.replies.forEach((reply) => {
                        text += `\t - ${reply.author}: ${reply.content}\n`;
                    });
                }
            });
            return text;
        };
        this.createNote = async (opts) => {
            const { note, engine, vault, confirmOverwrite, onPrompt, importComments } = opts;
            const existingNote = (await engine.findNotes({ fname: note.fname, vault }))[0];
            if (!lodash_1.default.isUndefined(existingNote)) {
                if (((importComments === null || importComments === void 0 ? void 0 : importComments.enable) &&
                    existingNote.custom.commentsUpdated !== (importComments === null || importComments === void 0 ? void 0 : importComments.enable)) ||
                    (existingNote.custom.revisionId &&
                        existingNote.custom.revisionId !== note.custom.revisionId)) {
                    if (importComments === null || importComments === void 0 ? void 0 : importComments.enable)
                        existingNote.custom.commentsUpdated = importComments === null || importComments === void 0 ? void 0 : importComments.enable;
                    existingNote.custom.revisionId = note.custom.revisionId;
                    existingNote.body = note.body;
                    if (confirmOverwrite && onPrompt) {
                        const resp = await onPrompt(basev3_1.PROMPT.USERPROMPT);
                        if ((resp === null || resp === void 0 ? void 0 : resp.title.toLowerCase()) === "yes") {
                            await engine.writeNote(existingNote);
                            return existingNote;
                        }
                    }
                    else {
                        await engine.writeNote(existingNote);
                        return existingNote;
                    }
                }
                else if (onPrompt) {
                    onPrompt();
                }
            }
            else {
                await engine.writeNote(note);
                return note;
            }
            return undefined;
        };
    }
    get config() {
        return utils_1.PodUtils.createImportConfig({
            required: ["accessToken", "refreshToken"],
            properties: {
                accessToken: {
                    type: "string",
                    description: "google docs personal access token",
                },
                refreshToken: {
                    type: "string",
                    description: "google docs personal refresh token",
                },
                expirationTime: {
                    type: "number",
                    description: "expiration time of access token",
                },
                importComments: {
                    type: "object",
                    nullable: true,
                    description: "import comments from the doc in text or json format",
                    required: ["enable"],
                    properties: {
                        enable: {
                            type: "boolean",
                            default: "false",
                        },
                        format: {
                            type: "string",
                            enum: ["json", "text"],
                            default: "json",
                            nullable: true,
                        },
                    },
                },
                confirmOverwrite: {
                    type: "boolean",
                    default: "true",
                    description: "get confirmation before overwriting existing note",
                    nullable: true,
                },
            },
        });
    }
    async _docs2Notes(entry, opts) {
        const { vault } = opts;
        if (!entry.fname) {
            throw new common_all_1.DendronError({ message: "fname not defined" });
        }
        const fname = entry.fname;
        if (opts.fnameAsId) {
            entry.id = fname;
        }
        const note = common_all_1.NoteUtils.create({ ...entry, fname, vault });
        return note;
    }
    async plant(opts) {
        const ctx = "GDocPod";
        const { wsRoot, engine, vault, config, onPrompt, utilityMethods } = opts;
        this.L.info({ ctx, msg: "enter" });
        const { showDocumentQuickPick, openFileInEditor, getGlobalState, updateGlobalState, showInputBox, } = utilityMethods;
        const { refreshToken, fnameAsId, importComments, confirmOverwrite = true, expirationTime, } = config;
        let { accessToken } = config;
        const vpath = (0, common_server_1.vault2Path)({ vault, wsRoot });
        const assetDir = path_1.default.join(vpath, common_all_1.FOLDERS.ASSETS);
        /** refreshes token if token has already expired */
        if (common_all_1.Time.now().toSeconds() > expirationTime) {
            const fpath = engine_server_1.EngineUtils.getPortFilePathForWorkspace({ wsRoot });
            const port = (0, engine_server_1.openPortFile)({ fpath });
            accessToken = await utils_1.PodUtils.refreshGoogleAccessToken(refreshToken, port);
        }
        const hierarchyDestOptions = {
            ignoreFocusOut: true,
            placeHolder: "Destination name here",
            title: "Hierarchy destination",
            prompt: "Enter the destination to import into ",
        };
        const documentIdOptions = {
            ignoreFocusOut: true,
            placeHolder: "Document ID here",
            title: "Document ID",
            prompt: "Request Timed Out. Enter the document Name",
        };
        const { docIdsHashMap, error } = await this.getAllDocuments(accessToken);
        if (lodash_1.default.isEmpty(docIdsHashMap) && lodash_1.default.isUndefined(error)) {
            throw new common_all_1.DendronError({
                message: "No documents present in google docs",
            });
        }
        /** document selected by user */
        const documentChoice = lodash_1.default.isUndefined(error)
            ? await showDocumentQuickPick(Object.keys(docIdsHashMap))
            : await showInputBox(documentIdOptions);
        if (lodash_1.default.isUndefined(documentChoice)) {
            return { importedNotes: [] };
        }
        const documentId = typeof documentChoice !== "string"
            ? docIdsHashMap[documentChoice.label]
            : await this.getDocumentId(accessToken, documentChoice);
        if (lodash_1.default.isUndefined(documentId)) {
            throw new common_all_1.DendronError({
                message: "No document present in google docs with this name",
            });
        }
        const cacheOption = typeof documentChoice !== "string"
            ? documentChoice.label
            : documentChoice;
        const cachedLabel = await getGlobalState(cacheOption);
        const defaultChoice = lodash_1.default.isUndefined(cachedLabel)
            ? cacheOption
            : cachedLabel;
        /**hierarchy destination entered by user */
        const hierarchyDestination = await showInputBox(hierarchyDestOptions, defaultChoice);
        if (lodash_1.default.isUndefined(hierarchyDestination)) {
            return { importedNotes: [] };
        }
        /**updates global state with key as document name and value as latest hierarchy selected by user */
        await updateGlobalState({
            key: cacheOption,
            value: hierarchyDestination,
        });
        let response = await this.getDataFromGDoc({ documentId, accessToken, hierarchyDestination, importComments }, config, assetDir);
        if (importComments === null || importComments === void 0 ? void 0 : importComments.enable) {
            response = await this.getCommentsFromDoc({ documentId, accessToken, importComments }, response);
        }
        const note = await this._docs2Notes(response, {
            vault,
            fnameAsId,
        });
        const createdNotes = await this.createNote({
            note,
            engine,
            wsRoot,
            vault,
            confirmOverwrite,
            onPrompt,
            importComments,
        });
        const importedNotes = createdNotes === undefined ? [] : [createdNotes];
        if (importedNotes.length > 0)
            openFileInEditor(importedNotes[0]);
        return { importedNotes };
    }
}
GDocImportPod.id = ID;
GDocImportPod.description = "import google doc";
exports.GDocImportPod = GDocImportPod;
//# sourceMappingURL=GDocPod.js.map