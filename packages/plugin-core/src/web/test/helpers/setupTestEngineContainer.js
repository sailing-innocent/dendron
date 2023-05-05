"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupTestEngineContainer = void 0;
const common_all_1 = require("@dendronhq/common-all");
const tsyringe_1 = require("tsyringe");
const NoteLookupProvider_1 = require("../../commands/lookup/NoteLookupProvider");
const DendronEngineV3Web_1 = require("../../engine/DendronEngineV3Web");
const VSCodeFileStore_1 = require("../../engine/store/VSCodeFileStore");
const TreeViewDummyConfig_1 = require("../../../views/common/treeview/TreeViewDummyConfig");
const lodash_1 = __importDefault(require("lodash"));
const note2File_1 = require("../../utils/note2File");
const WorkspaceHelpers_1 = require("./WorkspaceHelpers");
/**
 * Prepare a test container for running a real engine against a temporary
 * vault/note set. For most tests, this won't actually be necessary because we
 * can just run against in-memory notes
 */
async function setupTestEngineContainer() {
    const wsRoot = await setupTestFiles();
    const vaults = await getVaults();
    await setupHierarchyForLookupTests(vaults, wsRoot);
    const noteMetadataStore = new common_all_1.NoteMetadataStore(new common_all_1.FuseEngine({
        fuzzThreshold: 0.2,
    }));
    tsyringe_1.container.register("EngineEventEmitter", {
        useToken: "ReducedDEngine",
    });
    // Getting a DendronEngineV3Web instance is necessary for testing so that you
    // can call init() on it prior to running the test
    tsyringe_1.container.register(DendronEngineV3Web_1.DendronEngineV3Web, {
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
    const fs = tsyringe_1.container.resolve("IFileStore");
    const ds = tsyringe_1.container.resolve("IDataStore");
    const noteStore = new common_all_1.NoteStore(fs, ds, wsRoot);
    tsyringe_1.container.register("INoteStore", {
        useValue: noteStore,
    });
    tsyringe_1.container.register("NoteProvider", {
        useClass: NoteLookupProvider_1.NoteLookupProvider,
    });
    tsyringe_1.container.register("ITreeViewConfig", {
        useClass: TreeViewDummyConfig_1.TreeViewDummyConfig,
    });
    const config = getConfig();
    tsyringe_1.container.register("DendronConfig", {
        useValue: config,
    });
}
exports.setupTestEngineContainer = setupTestEngineContainer;
async function setupTestFiles() {
    const wsRoot = await WorkspaceHelpers_1.WorkspaceHelpers.getWSRootForTest();
    return wsRoot;
}
async function getVaults() {
    const vaults = [
        { fsPath: "vault1" },
        // { fsPath: "vault2", path: Utils.joinPath(wsRoot, "vault2") },
        // {
        //   fsPath: "vault3",
        //   name: "vaultThree",
        //   path: Utils.joinPath(wsRoot, "vault3"),
        // },
    ];
    return vaults;
}
// Logic below is temporarily borrowed from engine-test-utils:
async function setupHierarchyForLookupTests(vaults, wsRoot) {
    const opts = {
        vault: vaults[0],
        wsRoot,
    };
    const fnames = [
        "root",
        "foo",
        "foo.ch1",
        "foo.ch1.gch1",
        "foo.ch1.gch1.ggch1",
        "foo.ch1.gch2",
        "foo.ch2",
        "bar",
        "bar.ch1",
        "bar.ch1.gch1",
        "bar.ch1.gch1.ggch1",
        "goo.ends-with-ch1.no-ch1-by-itself",
    ];
    return Promise.all(fnames.map((fname) => {
        return createNote({ ...opts, fname });
    }));
}
async function createNote(opts) {
    const { fname, vault, props, body, genRandomId, noWrite, wsRoot, custom, stub, } = lodash_1.default.defaults(opts, { noWrite: false });
    /**
     * Make sure snapshots stay consistent
     */
    const defaultOpts = {
        created: 1,
        updated: 1,
        id: genRandomId ? (0, common_all_1.genUUID)() : fname,
    };
    const note = common_all_1.NoteUtils.create({
        ...defaultOpts,
        ...props,
        custom,
        fname,
        vault,
        body,
        stub,
    });
    if (!noWrite && !stub) {
        await (0, note2File_1.note2File)({ note, vault, wsRoot });
    }
    return note;
}
function getConfig() {
    const pubConfig = {
        copyAssets: false,
        siteHierarchies: [],
        enableSiteLastModified: false,
        siteRootDir: "",
        enableFrontmatterTags: false,
        enableHashesForFMTags: false,
        writeStubs: false,
        seo: {
            title: undefined,
            description: undefined,
            author: undefined,
            twitter: undefined,
            image: undefined,
        },
        github: {
            cname: undefined,
            enableEditLink: false,
            editLinkText: undefined,
            editBranch: undefined,
            editViewMode: undefined,
            editRepository: undefined,
        },
        enablePrettyLinks: false,
    };
    const config = {
        version: 5,
        publishing: pubConfig,
    };
    return config;
}
//# sourceMappingURL=setupTestEngineContainer.js.map