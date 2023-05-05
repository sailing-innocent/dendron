"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotePresetsUtils = void 0;
const __1 = require("..");
class NotePresetsUtils {
    static async createBasic({ vaultDir, fname, }) {
        await __1.NodeTestUtilsV2.createSchemas({ vaultPath: vaultDir });
        await __1.NodeTestUtilsV2.createNotes({ vaultPath: vaultDir });
        await __1.NodeTestUtilsV2.createNoteProps({
            vaultPath: vaultDir,
            rootName: fname,
        });
        await __1.NodeTestUtilsV2.createSchemaModuleOpts({
            vaultDir,
            rootName: fname,
        });
    }
}
exports.NotePresetsUtils = NotePresetsUtils;
//# sourceMappingURL=utils.js.map