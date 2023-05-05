export type DendronWebViewEntry = {
    label: string;
    desc: string;
    bundleName: string;
    type: "webview";
};
export type DendronNativeViewEntry = {
    label: string;
    desc: string;
    type: "nativeview";
};
export type DendronViewEntry = DendronWebViewEntry | DendronNativeViewEntry;
export declare enum DendronEditorViewKey {
    CONFIGURE = "dendron.configure",
    NOTE_GRAPH = "dendron.graph-note",
    SCHEMA_GRAPH = "dendron.graph-schema",
    NOTE_PREVIEW = "dendron.note-preview",
    SEED_BROWSER = "dendron.seed-browser"
}
export declare enum DendronTreeViewKey {
    SAMPLE_VIEW = "dendron.sample",
    TREE_VIEW = "dendron.treeView",
    BACKLINKS = "dendron.backlinks",
    CALENDAR_VIEW = "dendron.calendar-view",
    LOOKUP_VIEW = "dendron.lookup-view",
    TIP_OF_THE_DAY = "dendron.tip-of-the-day",
    HELP_AND_FEEDBACK = "dendron.help-and-feedback",
    GRAPH_PANEL = "dendron.graph-panel",
    RECENT_WORKSPACES = "dendron.recent-workspaces"
}
export declare const EDITOR_VIEWS: Record<DendronEditorViewKey, DendronViewEntry>;
/**
 * Value is the name of webpack bundle for webview based tree views
 */
export declare const TREE_VIEWS: Record<DendronTreeViewKey, DendronViewEntry>;
export declare const isWebViewEntry: (entry: DendronViewEntry) => entry is DendronWebViewEntry;
export declare const getWebTreeViewEntry: (key: DendronTreeViewKey) => DendronWebViewEntry;
export declare const getWebEditorViewEntry: (key: DendronEditorViewKey) => DendronWebViewEntry;
export declare enum BacklinkPanelSortOrder {
    /** Using path sorted so order with shallow first = true */
    PathNames = "PathNames",
    LastUpdated = "LastUpdated"
}
