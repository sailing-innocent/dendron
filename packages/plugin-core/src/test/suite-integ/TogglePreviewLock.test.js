"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mocha_1 = require("mocha");
const common_test_utils_1 = require("@dendronhq/common-test-utils");
const TogglePreviewLock_1 = require("../../commands/TogglePreviewLock");
const PreviewViewFactory_1 = require("../../components/views/PreviewViewFactory");
const ExtensionProvider_1 = require("../../ExtensionProvider");
const vsCodeUtils_1 = require("../../vsCodeUtils");
const testUtilsv2_1 = require("../testUtilsv2");
const testUtilsV3_1 = require("../testUtilsV3");
const sinon_1 = __importDefault(require("sinon"));
suite("GIVEN TogglePreviewLock", function () {
    let previewPanel;
    let cmd;
    (0, mocha_1.beforeEach)(() => {
        previewPanel = PreviewViewFactory_1.PreviewPanelFactory.create();
        cmd = new TogglePreviewLock_1.TogglePreviewLockCommand(previewPanel);
    });
    (0, mocha_1.afterEach)(async () => {
        await vsCodeUtils_1.VSCodeUtils.closeAllEditors();
        sinon_1.default.restore();
    });
    (0, testUtilsV3_1.describeSingleWS)("WHEN locking preview from the command bar", { timeout: 5e3 }, () => {
        (0, mocha_1.beforeEach)(() => {
            previewPanel.unlock(); // reset
        });
        (0, mocha_1.describe)("AND preview is hidden", () => {
            (0, mocha_1.test)("THEN preview should be NOT locked", async () => {
                await cmd.run();
                (0, testUtilsv2_1.expect)(previewPanel.isLocked()).toBeFalsy();
            });
        });
        (0, mocha_1.describe)("AND preview just opened", () => {
            let note1;
            let note2;
            (0, mocha_1.beforeEach)(async () => {
                const { engine, wsRoot, vaults } = ExtensionProvider_1.ExtensionProvider.getDWorkspace();
                note1 = await common_test_utils_1.NoteTestUtilsV4.createNoteWithEngine({
                    engine,
                    wsRoot,
                    vault: vaults[0],
                    fname: "preview-test",
                });
                await ExtensionProvider_1.ExtensionProvider.getWSUtils().openNote(note1);
                await previewPanel.show(note1);
            });
            (0, mocha_1.test)("THEN preview should be locked and pristine", async () => {
                /* This stub is added to fix an issue where test cases and
                container.resolve() take different values for wsRoot, resulting in
                undefined results for getNoteFromDocument. */
                const wsUtils = previewPanel._DO_NOT_USE_EXPOSED_FOR_TESTING_wsUtilsWeb();
                sinon_1.default.stub(wsUtils, "getNoteFromDocument").resolves([note1]);
                await cmd.run();
                (0, testUtilsv2_1.expect)(await previewPanel.isLockedAndDirty()).toBeFalsy();
            });
            (0, mocha_1.describe)("AND has been locked", () => {
                (0, mocha_1.beforeEach)(async () => {
                    await cmd.run();
                });
                (0, mocha_1.test)("THEN preview should toggle to unlocked", async () => {
                    await cmd.run();
                    (0, testUtilsv2_1.expect)(previewPanel.isLocked()).toBeFalsy();
                });
                (0, mocha_1.describe)("AND changing note", () => {
                    (0, mocha_1.beforeEach)(async () => {
                        const { engine, wsRoot, vaults } = ExtensionProvider_1.ExtensionProvider.getDWorkspace();
                        note2 = await common_test_utils_1.NoteTestUtilsV4.createNoteWithEngine({
                            engine,
                            wsRoot,
                            vault: vaults[0],
                            fname: "preview-test-2",
                        });
                        await ExtensionProvider_1.ExtensionProvider.getWSUtils().openNote(note2);
                        await previewPanel.show(note2);
                    });
                    (0, mocha_1.test)("THEN preview should be locked and dirty", async () => {
                        const wsUtils = previewPanel._DO_NOT_USE_EXPOSED_FOR_TESTING_wsUtilsWeb();
                        sinon_1.default.stub(wsUtils, "getNoteFromDocument").resolves([note2]);
                        (0, testUtilsv2_1.expect)(await previewPanel.isLockedAndDirty()).toBeTruthy();
                    });
                });
            });
        });
    });
});
//# sourceMappingURL=TogglePreviewLock.test.js.map