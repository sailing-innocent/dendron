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
const assert_1 = __importDefault(require("assert"));
const lodash_1 = __importDefault(require("lodash"));
const sinon_1 = __importDefault(require("sinon"));
const tsyringe_1 = require("tsyringe");
const vscode = __importStar(require("vscode"));
const vscode_uri_1 = require("vscode-uri");
const NoteLookupAutoCompleteCommand_1 = require("../../../../commands/common/NoteLookupAutoCompleteCommand");
const NativeTreeView_1 = require("../../../../views/common/treeview/NativeTreeView");
const CopyNoteURLCmd_1 = require("../../../commands/CopyNoteURLCmd");
const NoteLookupCmd_1 = require("../../../commands/NoteLookupCmd");
const setupWebExtContainer_1 = require("../../../injection-providers/setupWebExtContainer");
const WorkspaceHelpers_1 = require("../../helpers/WorkspaceHelpers");
async function setupEnvironment() {
    const wsRoot = await WorkspaceHelpers_1.WorkspaceHelpers.getWSRootForTest();
    const config = {
        workspace: {
            vaults: [
                {
                    fsPath: "test",
                    name: "test-name",
                },
            ],
        },
    };
    await WorkspaceHelpers_1.WorkspaceHelpers.createTestYAMLConfigFile(wsRoot, config);
    sinon_1.default.replaceGetter(vscode.workspace, "workspaceFile", () => vscode_uri_1.Utils.joinPath(wsRoot, "test.code-workspace"));
}
/**
 * This test suite ensures that all objects in main (extension.ts) can be
 * properly resolved by the DI container from `setupWebExtContainer`
 */
suite("GIVEN an injection container for the Dendron Web Extension configuration", () => {
    test("WHEN NoteLookupCmd is resolved THEN valid objects are returned without exceptions", async () => {
        await setupEnvironment();
        await (0, setupWebExtContainer_1.setupWebExtContainer)({
            extensionUri: vscode_uri_1.URI.parse("dummy"),
            subscriptions: [],
        });
        try {
            const cmd = tsyringe_1.container.resolve(NoteLookupCmd_1.NoteLookupCmd);
            (0, assert_1.default)(!lodash_1.default.isUndefined(cmd));
        }
        catch (error) {
            assert_1.default.fail(error);
        }
        finally {
            sinon_1.default.restore();
        }
    });
    test("WHEN CopyNoteURLCmd is resolved THEN valid objects are returned without exceptions", async () => {
        try {
            const cmd = tsyringe_1.container.resolve(CopyNoteURLCmd_1.CopyNoteURLCmd);
            (0, assert_1.default)(!lodash_1.default.isUndefined(cmd));
        }
        catch (error) {
            assert_1.default.fail(error);
        }
    });
    test("WHEN NoteLookupAutoCompleteCommand is resolved THEN valid objects are returned without exceptions", async () => {
        try {
            const cmd = tsyringe_1.container.resolve(NoteLookupAutoCompleteCommand_1.NoteLookupAutoCompleteCommand);
            (0, assert_1.default)(!lodash_1.default.isUndefined(cmd));
        }
        catch (error) {
            assert_1.default.fail(error);
        }
    });
    test("WHEN NativeTreeView is resolved THEN valid objects are returned without exceptions", async () => {
        try {
            const obj = tsyringe_1.container.resolve(NativeTreeView_1.NativeTreeView);
            (0, assert_1.default)(!lodash_1.default.isUndefined(obj));
        }
        catch (error) {
            assert_1.default.fail(error);
        }
    });
    test("WHEN ITelemetryClient is resolved THEN valid objects are returned without exceptions", async () => {
        try {
            const obj = tsyringe_1.container.resolve("ITelemetryClient");
            (0, assert_1.default)(!lodash_1.default.isUndefined(obj));
        }
        catch (error) {
            assert_1.default.fail(error);
        }
    });
});
//# sourceMappingURL=setupWebExtContainer.test.js.map