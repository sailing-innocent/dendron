import chokidar from "chokidar";
import type { Disposable } from "@dendronhq/common-all";
export type FileWatcherAdapter = {
    onDidCreate(callback: (filePath: string) => void): Disposable;
    onDidDelete(callback: (filePath: string) => void): Disposable;
    onDidChange(callback: (filePath: string) => void): Disposable;
};
export declare class EngineFileWatcher implements FileWatcherAdapter {
    private watcher;
    constructor(base: string, pattern: string, chokidarOpts?: chokidar.WatchOptions, onReady?: () => void);
    private onEvent;
    onDidCreate(callback: (filePath: string) => void): Disposable;
    onDidDelete(callback: (filePath: string) => void): Disposable;
    onDidChange(callback: (filePath: string) => void): Disposable;
}
