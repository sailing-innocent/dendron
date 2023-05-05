"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileAddWatcher = void 0;
const fileWatcher_1 = require("./fileWatcher");
const path_1 = __importDefault(require("path"));
const common_server_1 = require("@dendronhq/common-server");
/** Watches `folders` to see if a `file` is added. Once one is added, the
 * `callback` is run.
 *
 * This will also run if `file` already exists in `folders`. This is necessary
 * to avoid race conditions between FileAddWatcher initializing and the file
 * getting added.
 *
 * **Limitations**: Any folders that start with `.` will not get watched. This
 * makes things more efficient because we don't have to search folders like
 * `.git`. The watcher will also only watch up to some depth, so this might fall
 * short for folders with deep nesting.
 *
 * Remember to dispose this service once you are done to stop watching folders!
 */
class FileAddWatcher {
    onDidCreate(filePath) {
        // Double-check the filename of the file that was created
        if (path_1.default.basename(filePath) !== this.file)
            return;
        if (this.callback)
            this.callback(filePath);
    }
    /** Watches `folders` to see if a `file` is added. Once one is added, the
     * `callback` is run.
     *
     * This will also run if `file` already exists in `folders`. This is necessary
     * to avoid race conditions between FileAddWatcher initializing and the file
     * getting added.
     *
     * **Limitations**: Any folders that start with `.` will not get watched, as
     * well as some other folders listed in `ENGINE_WATCHER_IGNORES`. Also, we
     * only watch up to a certain depth to limit the performance impact of this.
     *
     * Remember to dispose this service once you are done to stop watching
     * folders!
     */
    constructor(folders, file, callback) {
        const topFolders = (0, common_server_1.uniqueOutermostFolders)(folders);
        this.callback = callback;
        this.file = file;
        this.fileWatchers = topFolders.map((folder) => new fileWatcher_1.EngineFileWatcher(folder, `**/${file}`, {
            depth: common_server_1.WS_FILE_MAX_SEARCH_DEPTH,
            ignoreInitial: false,
        }).onDidCreate(this.onDidCreate.bind(this)));
    }
    dispose() {
        var _a;
        (_a = this.fileWatchers) === null || _a === void 0 ? void 0 : _a.forEach((watcher) => watcher.dispose());
        this.fileWatchers = [];
    }
}
exports.FileAddWatcher = FileAddWatcher;
//# sourceMappingURL=fileAddWatcher.js.map