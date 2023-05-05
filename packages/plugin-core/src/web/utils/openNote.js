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
exports.findAnchorPos = exports.trySelectRevealNonNoteAnchor = exports.openNote = void 0;
const common_all_1 = require("@dendronhq/common-all");
const vscode_1 = require("vscode");
const vscode = __importStar(require("vscode"));
const vscode_uri_1 = require("vscode-uri");
const unified_1 = require("@dendronhq/unified");
const lodash_1 = __importDefault(require("lodash"));
async function openNote({ wsRoot, fname, vault, anchor, column, note, }) {
    const doc = await vscode.workspace.openTextDocument(
    // TODO: Replace with getURIForNote utils method
    vscode_uri_1.Utils.joinPath(wsRoot, common_all_1.VaultUtils.getRelPath(vault), fname + ".md"));
    const editor = await vscode.window.showTextDocument(doc, column);
    if (anchor) {
        const pos = (0, exports.findAnchorPos)({ anchor, note });
        editor.selection = new vscode_1.Selection(pos, pos);
        editor.revealRange(editor.selection);
    }
}
exports.openNote = openNote;
// Borrowed from WSUtilsV2.ts
async function trySelectRevealNonNoteAnchor(editor, anchor) {
    let position;
    switch (anchor.type) {
        case "line":
            // Line anchors are direct line numbers from the start
            position = new vscode_1.Position(anchor.line - 1 /* line 1 is index 0 */, 0);
            break;
        case "block":
            // We don't parse non note files for anchors, so read the document and find where the anchor is
            position = editor === null || editor === void 0 ? void 0 : editor.document.positionAt(editor === null || editor === void 0 ? void 0 : editor.document.getText().indexOf(unified_1.AnchorUtils.anchor2string(anchor)));
            break;
        default:
            // not supported for non-note files
            position = undefined;
    }
    if (position) {
        // if we did find the anchor, then select and scroll to it
        editor.selection = new vscode_1.Selection(position, position);
        editor.revealRange(editor.selection);
    }
}
exports.trySelectRevealNonNoteAnchor = trySelectRevealNonNoteAnchor;
// Borrowed from GoToNote.ts
const findAnchorPos = (opts) => {
    const { anchor: findAnchor, note } = opts;
    let key;
    switch (findAnchor.type) {
        case "line":
            return new vscode_1.Position(findAnchor.line - 1, 0);
        case "block":
            key = `^${findAnchor.value}`;
            break;
        case "header":
            key = (0, common_all_1.getSlugger)().slug(findAnchor.value);
            break;
        default:
            (0, common_all_1.assertUnreachable)(findAnchor);
    }
    const found = note.anchors[key];
    if (lodash_1.default.isUndefined(found))
        return new vscode_1.Position(0, 0);
    return new vscode_1.Position(found.line, found.column);
};
exports.findAnchorPos = findAnchorPos;
//# sourceMappingURL=openNote.js.map