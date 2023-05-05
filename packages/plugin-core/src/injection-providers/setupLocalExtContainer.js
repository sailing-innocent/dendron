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
exports.setupLocalExtContainer = void 0;
require("reflect-metadata");
const tsyringe_1 = require("tsyringe");
const vscode = __importStar(require("vscode"));
const MetadataSvcTreeViewConfig_1 = require("../views/node/treeview/MetadataSvcTreeViewConfig");
const PreviewPanel_1 = require("../views/common/preview/PreviewPanel");
const PreviewLinkHandler_1 = require("../components/views/PreviewLinkHandler");
const TextDocumentService_1 = require("../services/node/TextDocumentService");
const ConsoleLogger_1 = require("../web/utils/ConsoleLogger");
const engine_server_1 = require("@dendronhq/engine-server");
const fs_extra_1 = __importDefault(require("fs-extra"));
async function setupLocalExtContainer(opts) {
    const { wsRoot, engine, vaults, config, context } = opts;
    tsyringe_1.container.register("EngineEventEmitter", {
        useToken: "ReducedDEngine",
    });
    tsyringe_1.container.register("wsRoot", { useValue: vscode.Uri.file(wsRoot) });
    tsyringe_1.container.register("ReducedDEngine", { useValue: engine });
    tsyringe_1.container.register("vaults", { useValue: vaults });
    tsyringe_1.container.register("ITreeViewConfig", {
        useClass: MetadataSvcTreeViewConfig_1.MetadataSvcTreeViewConfig,
    });
    tsyringe_1.container.register("DendronConfig", {
        useValue: config,
    });
    tsyringe_1.container.register("IPreviewLinkHandler", {
        useClass: PreviewLinkHandler_1.PreviewLinkHandler,
    });
    tsyringe_1.container.register("ITextDocumentService", {
        useClass: TextDocumentService_1.TextDocumentService,
    }, { lifecycle: tsyringe_1.Lifecycle.Singleton });
    // TODO: add logge that adds log to dendron.log
    tsyringe_1.container.register("logger", {
        useClass: ConsoleLogger_1.ConsoleLogger,
    });
    tsyringe_1.container.register("textDocumentEvent", {
        useValue: vscode.workspace.onDidSaveTextDocument,
    });
    tsyringe_1.container.register("PreviewProxy", {
        useClass: PreviewPanel_1.PreviewPanel,
    });
    const fpath = engine_server_1.EngineUtils.getPortFilePathForWorkspace({ wsRoot });
    const port = (await fs_extra_1.default.pathExists(fpath)) ? (0, engine_server_1.openPortFile)({ fpath }) : 1;
    tsyringe_1.container.register("port", {
        useValue: port,
    });
    tsyringe_1.container.register("extensionUri", {
        useValue: context.extensionUri,
    });
}
exports.setupLocalExtContainer = setupLocalExtContainer;
//# sourceMappingURL=setupLocalExtContainer.js.map