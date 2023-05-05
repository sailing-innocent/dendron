import type { Disposable } from "vscode";
export type AutoInitCallback = (filePath: string) => any;
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
export declare class FileAddWatcher implements Disposable {
    private file;
    private fileWatchers;
    private callback;
    private onDidCreate;
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
    constructor(folders: string[], file: string, callback: AutoInitCallback);
    dispose(): void;
}
