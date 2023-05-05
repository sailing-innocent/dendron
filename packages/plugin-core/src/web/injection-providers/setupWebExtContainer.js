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
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupWebExtContainer = void 0;
const common_all_1 = require("@dendronhq/common-all");
const tsyringe_1 = require("tsyringe");
const vscode = __importStar(require("vscode"));
const vscode_1 = require("vscode");
const TextDocumentService_1 = require("../../services/web/TextDocumentService");
const DummyTelemetryClient_1 = require("../../telemetry/common/DummyTelemetryClient");
const WebTelemetryClient_1 = require("../../telemetry/web/WebTelemetryClient");
const TreeViewDummyConfig_1 = require("../../views/common/treeview/TreeViewDummyConfig");
const NoteLookupProvider_1 = require("../commands/lookup/NoteLookupProvider");
const DendronEngineV3Web_1 = require("../engine/DendronEngineV3Web");
const VSCodeFileStore_1 = require("../engine/store/VSCodeFileStore");
const ConsoleLogger_1 = require("../utils/ConsoleLogger");
const IPreviewPanelConfig_1 = require("../views/preview/IPreviewPanelConfig");
const PreviewLinkHandler_1 = require("../views/preview/PreviewLinkHandler");
const PreviewPanel_1 = require("../../views/common/preview/PreviewPanel");
const getAssetsPrefix_1 = require("./getAssetsPrefix");
const getEnablePrettlyLinks_1 = require("./getEnablePrettlyLinks");
const getFuseEngine_1 = require("./getFuseEngine");
const getSiteIndex_1 = require("./getSiteIndex");
const getSiteUrl_1 = require("./getSiteUrl");
const getVaults_1 = require("./getVaults");
const getWorkspaceConfig_1 = require("./getWorkspaceConfig");
const getWSRoot_1 = require("./getWSRoot");
/**
 * This function prepares a TSyringe container suitable for the Web Extension
 * flavor of the Dendron Plugin.
 *
 * It uses a VSCodeFileStore and includes a reduced engine that runs in-memory.
 */
async function setupWebExtContainer(context) {
    const wsRoot = await (0, getWSRoot_1.getWSRoot)();
    if (!wsRoot) {
        throw new Error("Unable to find wsRoot!");
    }
    const vaults = await (0, getVaults_1.getVaults)(wsRoot);
    const assetsPrefix = await (0, getAssetsPrefix_1.getAssetsPrefix)(wsRoot);
    const enablePrettyLinks = await (0, getEnablePrettlyLinks_1.getEnablePrettlyLinks)(wsRoot);
    const siteUrl = await (0, getSiteUrl_1.getSiteUrl)(wsRoot);
    const siteIndex = await (0, getSiteIndex_1.getSiteIndex)(wsRoot);
    const fuseEngine = await (0, getFuseEngine_1.getFuseEngine)(wsRoot);
    const noteMetadataStore = new common_all_1.NoteMetadataStore(fuseEngine);
    tsyringe_1.container.register("extensionContext", {
        useValue: context,
    });
    // The EngineEventEmitter is also DendronEngineV3Web, so reuse the same token
    // to supply any emitter consumers. This ensures the same engine singleton
    // gets used everywhere.
    tsyringe_1.container.register("EngineEventEmitter", {
        useToken: "ReducedDEngine",
    });
    tsyringe_1.container.register("ReducedDEngine", {
        useClass: DendronEngineV3Web_1.DendronEngineV3Web,
    }, { lifecycle: tsyringe_1.Lifecycle.Singleton });
    tsyringe_1.container.register("IFileStore", {
        useClass: VSCodeFileStore_1.VSCodeFileStore,
    });
    tsyringe_1.container.register("IDataStore", {
        useValue: noteMetadataStore,
    });
    tsyringe_1.container.register("wsRoot", { useValue: wsRoot });
    tsyringe_1.container.register("vaults", { useValue: vaults });
    tsyringe_1.container.register("assetsPrefix", { useValue: assetsPrefix });
    tsyringe_1.container.register("enablePrettyLinks", { useValue: enablePrettyLinks });
    tsyringe_1.container.register("siteUrl", { useValue: siteUrl });
    tsyringe_1.container.register("siteIndex", { useValue: siteIndex });
    tsyringe_1.container.register("INoteStore", {
        useFactory: (container) => {
            const fs = container.resolve("IFileStore");
            const ds = container.resolve("IDataStore");
            return new common_all_1.NoteStore(fs, ds, wsRoot);
        },
    });
    tsyringe_1.container.register("NoteProvider", {
        useClass: NoteLookupProvider_1.NoteLookupProvider,
    });
    tsyringe_1.container.afterResolution("ReducedDEngine", (_t, result) => {
        if ("init" in result) {
            result.init().then(() => { }, (reason) => {
                throw new Error(`Dendron Engine Failed to Initialize: ${reason}`);
            });
        }
    }, { frequency: "Once" });
    tsyringe_1.container.register("ITreeViewConfig", {
        useClass: TreeViewDummyConfig_1.TreeViewDummyConfig,
    });
    setupTelemetry();
    tsyringe_1.container.register("PreviewProxy", {
        useClass: PreviewPanel_1.PreviewPanel,
    });
    tsyringe_1.container.register("extensionUri", {
        useValue: context.extensionUri,
    });
    tsyringe_1.container.register("IPreviewLinkHandler", {
        useClass: PreviewLinkHandler_1.PreviewLinkHandler,
    });
    tsyringe_1.container.register("IPreviewPanelConfig", {
        useClass: IPreviewPanelConfig_1.DummyPreviewPanelConfig, // TODO: Add a real one
    });
    tsyringe_1.container.register("ITextDocumentService", {
        useClass: TextDocumentService_1.TextDocumentService,
    });
    tsyringe_1.container.register("textDocumentEvent", {
        useValue: vscode_1.workspace.onDidSaveTextDocument,
    });
    tsyringe_1.container.register("logger", {
        useClass: ConsoleLogger_1.ConsoleLogger,
    });
    // Just use a dummy number - this isn't actually used by the web logic, but
    // it's a dependency in some util methods.
    tsyringe_1.container.register("port", {
        useValue: 1,
    });
    const config = await (0, getWorkspaceConfig_1.getWorkspaceConfig)(wsRoot);
    tsyringe_1.container.register("DendronConfig", {
        useValue: config,
    });
    setupTabAutoComplete(context);
}
exports.setupWebExtContainer = setupWebExtContainer;
function setupTelemetry() {
    const stage = (0, common_all_1.getStage)();
    switch (stage) {
        case "prod": {
            tsyringe_1.container.register("ITelemetryClient", {
                useClass: WebTelemetryClient_1.WebTelemetryClient,
            });
            break;
        }
        default: {
            tsyringe_1.container.register("ITelemetryClient", {
                useClass: DummyTelemetryClient_1.DummyTelemetryClient,
            });
            break;
        }
    }
}
function setupTabAutoComplete(context) {
    const emitter = new vscode.EventEmitter();
    // Add to extension disposables for auto-cleanup:
    context.subscriptions.push(emitter);
    tsyringe_1.container.registerInstance("AutoCompleteEventEmitter", emitter);
    tsyringe_1.container.registerInstance("AutoCompleteEvent", emitter.event);
}
//# sourceMappingURL=setupWebExtContainer.js.map