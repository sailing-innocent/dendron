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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreviewPanel = void 0;
// @ts-nocheck
const common_all_1 = require("@dendronhq/common-all");
const unified_1 = require("@dendronhq/unified");
const lodash_1 = __importDefault(require("lodash"));
const tsyringe_1 = require("tsyringe");
const vscode = __importStar(require("vscode"));
const vscode_uri_1 = require("vscode-uri");
const isPathInWorkspace_1 = require("../../../web/utils/isPathInWorkspace");
const WSUtils_1 = require("../../../web/utils/WSUtils");
const WebViewUtils_1 = require("../../../web/views/preview/WebViewUtils");
/**
 * This is the default implementation of PreviewProxy. It contains a singleton
 * of a vscode webviewPanel that renders the note preview. Furthermore, it will
 * automatically handle event subscriptions to know when to update the preview,
 * as well as properly dispose of the resources when the preview has been
 * closed.
 */
let PreviewPanel = class PreviewPanel {
    /**
     *
     * @param param0 extension - IDendronExtension implementation. linkHandler -
     * Implementation to handle preview link clicked events
     */
    constructor(_linkHandler, _textDocumentService, logger, wsRoot, wsUtils, webViewUtils, vaults, dendronConfig, engine) {
        this._linkHandler = _linkHandler;
        this._textDocumentService = _textDocumentService;
        this.logger = logger;
        this.wsRoot = wsRoot;
        this.wsUtils = wsUtils;
        this.webViewUtils = webViewUtils;
        this.vaults = vaults;
        this.dendronConfig = dendronConfig;
        this.engine = engine;
        this._onDidChangeActiveTextEditor = undefined;
        this._onTextChanged = undefined;
        /** Rewrites the image URLs to use VSCode's webview URIs, which is required to
         * access files from the preview.
         *
         * The results of this is cached based on the note content hash, so repeated
         * calls should not be excessively expensive.
         */
        this.rewriteImageUrls = (0, common_all_1.memoize)({
            fn: (note, panel) => {
                const parser = unified_1.MDUtilsV5.procRemarkFull({
                    noteToRender: note,
                    dest: common_all_1.DendronASTDest.MD_DENDRON,
                    fname: note.fname,
                    vault: note.vault,
                    config: this.dendronConfig,
                    wsRoot: this.wsRoot.fsPath,
                    vaults: this.vaults,
                });
                const tree = parser.parse(note.body);
                // ^preview-rewrites-images
                (0, unified_1.visit)(tree, [unified_1.DendronASTTypes.IMAGE, unified_1.DendronASTTypes.EXTENDED_IMAGE], (image) => {
                    if (!(0, common_all_1.isWebUri)(image.url)) {
                        (0, unified_1.makeImageUrlFullPath)({ node: image, proc: parser });
                        image.url = panel.webview
                            .asWebviewUri(vscode.Uri.file(image.url))
                            .toString();
                    }
                });
                return {
                    ...note,
                    body: parser.stringify(tree),
                };
            },
            keyFn: (note) => note.id,
            shouldUpdate: (previous, current) => previous.contentHash !== current.contentHash,
        });
    }
    /**
     * Show the preview.
     * @param note - if specified, this will override the preview contents with
     * the contents specified in this parameter. Otherwise, the contents of the
     * preview will follow default behavior (it will show the currently in-focus
     * Dendron note).
     */
    async show(note) {
        if (this._panel) {
            if (!this.isVisible()) {
                this._panel.reveal();
            }
        }
        else {
            const viewColumn = vscode.ViewColumn.Beside; // Editor column to show the new webview panel in.
            const preserveFocus = true;
            const { bundleName: name, label } = (0, common_all_1.getWebEditorViewEntry)(common_all_1.DendronEditorViewKey.NOTE_PREVIEW);
            this._panel = vscode.window.createWebviewPanel(name, label, {
                viewColumn,
                preserveFocus,
            }, {
                enableScripts: true,
                enableCommandUris: true,
                retainContextWhenHidden: true,
                enableFindWidget: true,
                localResourceRoots: this.webViewUtils
                    .getLocalResourceRoots()
                    .concat(this.wsRoot),
            });
            const webViewAssets = this.webViewUtils.getJsAndCss();
            const initialTheme = common_all_1.ConfigUtils.getPreview(this.dendronConfig).theme || "";
            const html = await this.webViewUtils.getWebviewContent({
                ...webViewAssets,
                name,
                panel: this._panel,
                initialTheme,
            });
            this._panel.webview.html = html;
            this.setupCallbacks();
            this._panel.onDidDispose(() => {
                if (this._onDidChangeActiveTextEditor) {
                    this._onDidChangeActiveTextEditor.dispose();
                    this._onDidChangeActiveTextEditor = undefined;
                }
                if (this._onTextChanged) {
                    this._onTextChanged.dispose();
                    this._onTextChanged = undefined;
                }
                this._panel = undefined;
                this.unlock();
            });
            this._panel.reveal(viewColumn, preserveFocus);
        }
        if (note && this.isVisible()) {
            this.sendRefreshMessage(this._panel, note, true);
        }
    }
    hide() {
        this.dispose();
    }
    async lock(noteId) {
        if (noteId) {
            this._lockedEditorNoteId = noteId;
            this.sendLockMessage(this._panel, this.isLocked());
        }
        else {
            this.logger.error({
                ctx: "lock preview",
                msg: "Did not find note to lock.",
            });
        }
    }
    unlock() {
        this._lockedEditorNoteId = undefined;
        this.sendLockMessage(this._panel, this.isLocked());
    }
    isOpen() {
        return this._panel !== undefined;
    }
    isVisible() {
        return this._panel !== undefined && this._panel.visible;
    }
    isLocked() {
        return this._lockedEditorNoteId !== undefined;
    }
    /**
     * If the Preview is locked and the active note does not match the locked note.
     */
    async isLockedAndDirty() {
        const note = await this.wsUtils.getActiveNote();
        return this.isLocked() && (note === null || note === void 0 ? void 0 : note.id) !== this._lockedEditorNoteId;
    }
    dispose() {
        this.unlock();
        if (this._panel) {
            this._panel.dispose();
            this._panel = undefined;
        }
    }
    setupCallbacks() {
        // Callback on getting a message back from the webview
        this._panel.webview.onDidReceiveMessage(async (msg) => {
            const ctx = "ShowPreview:onDidReceiveMessage";
            this.logger.debug({ ctx, msgType: msg.type });
            switch (msg.type) {
                case common_all_1.DMessageEnum.ON_DID_CHANGE_ACTIVE_TEXT_EDITOR:
                case common_all_1.DMessageEnum.INIT: {
                    // do nothing
                    break;
                }
                case common_all_1.DMessageEnum.MESSAGE_DISPATCHER_READY: {
                    // if ready, get current note
                    let note;
                    if (this.initWithNote !== undefined) {
                        note = this.initWithNote;
                        this.logger.debug({
                            ctx,
                            msg: "got pre-set note",
                            note: common_all_1.NoteUtils.toLogObj(note),
                        });
                    }
                    else {
                        note = await this.wsUtils.getActiveNote();
                        if (note) {
                            this.logger.debug({
                                ctx,
                                msg: "got active note",
                                note: common_all_1.NoteUtils.toLogObj(note),
                            });
                        }
                    }
                    if (note) {
                        this.sendRefreshMessage(this._panel, note, true);
                    }
                    break;
                }
                case common_all_1.NoteViewMessageEnum.onClick: {
                    const { data } = msg;
                    this._linkHandler.onLinkClicked({ data });
                    break;
                }
                case common_all_1.NoteViewMessageEnum.onGetActiveEditor: {
                    this.logger.debug({ ctx, "msg.type": "onGetActiveEditor" });
                    const activeTextEditor = vscode.window.activeTextEditor;
                    const maybeNote = !lodash_1.default.isUndefined(activeTextEditor)
                        ? await this.wsUtils.getNoteFromDocument(activeTextEditor === null || activeTextEditor === void 0 ? void 0 : activeTextEditor.document)
                        : undefined;
                    if (!lodash_1.default.isUndefined(maybeNote)) {
                        this.sendRefreshMessage(this._panel, maybeNote[0], true);
                    }
                    break;
                }
                case common_all_1.NoteViewMessageEnum.onLock: {
                    const { data } = msg;
                    this.logger.debug({ ctx, "msg.type": "onLock" });
                    this.lock(data.id);
                    break;
                }
                case common_all_1.NoteViewMessageEnum.onUnlock: {
                    this.logger.debug({ ctx, "msg.type": "onUnlock" });
                    this.unlock();
                    break;
                }
                case common_all_1.DMessageEnum.ON_UPDATE_PREVIEW_HTML:
                    break;
                default:
                    (0, common_all_1.assertUnreachable)(msg.type);
            }
        });
        // If the user changes focus, then the newly in-focus Dendron note should be
        // shown in the preview
        this._onDidChangeActiveTextEditor =
            vscode.window.onDidChangeActiveTextEditor(
            // sentryReportingCallback(
            async (editor) => {
                var _a;
                if (!editor ||
                    editor.document.uri.fsPath !==
                        ((_a = vscode.window.activeTextEditor) === null || _a === void 0 ? void 0 : _a.document.uri.fsPath) ||
                    (await this.isLockedAndDirty())) {
                    return;
                }
                const textDocument = editor.document;
                if (!(0, isPathInWorkspace_1.isPathInWorkspace)({
                    wsRoot: this.wsRoot,
                    vaults: this.vaults,
                    fsPath: textDocument.uri,
                })) {
                    return;
                }
                const maybeNote = await this.wsUtils.getNoteFromDocument(editor.document);
                if (!maybeNote || maybeNote.length !== 1) {
                    return;
                }
                this.sendRefreshMessage(this._panel, maybeNote[0], true);
            }
            // )
            );
        // If the text document contents have changed, update the preview with the new
        // contents. This call is debounced every 200 ms
        this._onTextChanged = vscode.workspace.onDidChangeTextDocument(lodash_1.default.debounce(this.updatePreviewPanel, 200), this);
    }
    /**
     * Notify preview webview panel to display latest contents
     *
     * @param panel panel to notify
     * @param note note to display
     * @param isFullRefresh If true, sync contents of note with what's being seen in active editor.
     * This will be true in cases where user switches between tabs or opens/closes notes without saving, as contents of notes may not match engine notes.
     * Otherwise display contents of note
     */
    async sendRefreshMessage(panel, note, isFullRefresh) {
        var _a, _b, _c;
        if (this.isVisible()) {
            // Engine state has not changed so do not sync. This is for displaying updated text only
            // If full refresh is required, sync note with contents in active text editor
            const textDocument = (_a = vscode.window.activeTextEditor) === null || _a === void 0 ? void 0 : _a.document;
            if (textDocument && isFullRefresh) {
                note = await this._textDocumentService.applyTextDocumentToNoteProps(note, textDocument);
            }
            note = this.rewriteImageUrls(note, panel);
            let html = "";
            const resp = await this.engine.renderNote({
                id: note.id,
                note,
            });
            if (resp.error) {
                vscode.window.showErrorMessage(`Problem Rendering Note: ${(_b = resp.error) === null || _b === void 0 ? void 0 : _b.message}`);
                // TODO: log error
                html = `Problem Rendering Note: ${(_c = resp.error) === null || _c === void 0 ? void 0 : _c.message}`;
            }
            else {
                html = resp.data;
            }
            const data = {
                note,
                html,
            };
            try {
                return panel.webview.postMessage({
                    type: common_all_1.DMessageEnum.ON_UPDATE_PREVIEW_HTML,
                    data,
                    source: "vscode",
                });
            }
            catch (err) {
                this.logger.info({
                    ctx: "sendRefreshMessage",
                    state: "webview is disposed",
                });
                return;
            }
        }
        return;
    }
    sendLockMessage(panel, isLocked) {
        try {
            return panel === null || panel === void 0 ? void 0 : panel.webview.postMessage({
                type: isLocked
                    ? common_all_1.NoteViewMessageEnum.onLock
                    : common_all_1.NoteViewMessageEnum.onUnlock,
                data: {},
                source: "vscode",
            });
        }
        catch (err) {
            this.logger.info({
                ctx: "sendLockMessage",
                state: "webview is disposed",
            });
            return;
        }
    }
    /**
     * If panel is visible, update preview panel with text document changes
     */
    async updatePreviewPanel(textDocument) {
        if (textDocument.document.isDirty === false) {
            return;
        }
        if (this.isVisible() && !(await this.isLockedAndDirty())) {
            const note = await this._textDocumentService.processTextDocumentChangeEvent(textDocument);
            if (note) {
                return this.sendRefreshMessage(this._panel, note, false);
            }
        }
        return undefined;
    }
    // eslint-disable-next-line camelcase
    __DO_NOT_USE_IN_PROD_exposePropsForTesting() {
        return {
            rewriteImageUrls: (note) => {
                if (!this._panel)
                    throw new common_all_1.DendronError({
                        message: "Panel used before being initalized",
                    });
                return this.rewriteImageUrls(note, this._panel);
            },
        };
    }
    // TODO: delete this when tsyringe is better adopted on local side
    // eslint-disable-next-line camelcase
    _DO_NOT_USE_EXPOSED_FOR_TESTING_wsUtilsWeb() {
        return this.wsUtils;
    }
};
PreviewPanel = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)("IPreviewLinkHandler")),
    __param(1, (0, tsyringe_1.inject)("ITextDocumentService")),
    __param(2, (0, tsyringe_1.inject)("logger")),
    __param(3, (0, tsyringe_1.inject)("wsRoot")),
    __param(6, (0, tsyringe_1.inject)("vaults")),
    __param(7, (0, tsyringe_1.inject)("DendronConfig")),
    __param(8, (0, tsyringe_1.inject)("ReducedDEngine")),
    __metadata("design:paramtypes", [Object, Object, Object, vscode_uri_1.URI,
        WSUtils_1.WSUtilsWeb,
        WebViewUtils_1.WebViewUtils, Array, Object, Object])
], PreviewPanel);
exports.PreviewPanel = PreviewPanel;
//# sourceMappingURL=PreviewPanel.js.map