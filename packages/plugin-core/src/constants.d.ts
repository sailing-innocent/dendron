import { DendronTreeViewKey } from "@dendronhq/common-all";
export declare const extensionQualifiedId = "dendron.dendron";
export declare const DEFAULT_LEGACY_VAULT_NAME = "vault";
export declare enum DendronContext {
    PLUGIN_ACTIVE = "dendron:pluginActive",
    PLUGIN_NOT_ACTIVE = "!dendron:pluginActive",
    DEV_MODE = "dendron:devMode",
    HAS_LEGACY_PREVIEW = "dendron:hasLegacyPreview",
    HAS_CUSTOM_MARKDOWN_VIEW = "hasCustomMarkdownPreview",
    NOTE_LOOK_UP_ACTIVE = "dendron:noteLookupActive",
    SHOULD_SHOW_LOOKUP_VIEW = "dendron:shouldShowLookupView",
    BACKLINKS_SORT_ORDER = "dendron:backlinksSortOrder",
    ENABLE_EXPORT_PODV2 = "dendron:enableExportPodV2",
    TREEVIEW_TREE_ITEM_LABEL_TYPE = "dendron:treeviewItemLabelType",
    GRAPH_PANEL_SHOW_BACKLINKS = "dendron.graph-panel.showBacklinks",
    GRAPH_PANEL_SHOW_OUTWARD_LINKS = "dendron.graph-panel.showOutwardLinks",
    GRAPH_PANEL_SHOW_HIERARCHY = "dendron.graph-panel.showHierarchy"
}
/**
 * Invocation point for the LaunchTutorialCommand. Used for telemetry purposes
 */
export declare enum LaunchTutorialCommandInvocationPoint {
    RecentWorkspacesPanel = "RecentWorkspacesPanel",
    WelcomeWebview = "WelcomeWebview"
}
export declare const DENDRON_VIEWS_WELCOME: {
    view: DendronTreeViewKey;
    contents: string;
}[];
export declare const DENDRON_VIEWS_CONTAINERS: {
    activitybar: {
        id: string;
        title: string;
        icon: string;
    }[];
};
export declare const DENDRON_VIEWS: ({
    id: DendronTreeViewKey;
    name: string;
    when: string;
    type: string;
    where: string;
} | {
    when: string;
    where: string;
    icon: string;
    id: string;
    name: string;
    type?: "webview" | undefined;
} | {
    when: string;
    where: string;
    id: string;
    name: string;
    type?: "webview" | undefined;
})[];
type KeyBinding = {
    key?: string;
    mac?: string;
    windows?: string;
    when?: string;
    args?: any;
};
type ConfigEntry = {
    key: string;
    description: string;
    type: "string" | "boolean" | "number";
    default?: any;
    enum?: string[];
    scope?: CommandEntry;
};
type Entry = {
    name: string;
    description: string;
    data: any;
};
type CommandEntry = {
    key: string;
    title: string;
    keybindings?: KeyBinding;
    icon?: string;
    when?: string;
    enablement?: string;
};
export declare const ICONS: {
    LINK_CANDIDATE: string;
    WIKILINK: string;
    SCHEMA: string;
};
export declare const DENDRON_WORKSPACE_FILE = "dendron.code-workspace";
export declare const DENDRON_REMOTE_VAULTS: Entry[];
type CommandPaletteEntry = {
    command: string;
    when?: string;
};
export declare const DENDRON_MENUS: {
    commandPalette: CommandPaletteEntry[];
    "view/title": ({
        command: string;
        when: string;
        group: string;
    } | {
        command: string;
        when: string;
        group?: undefined;
    })[];
    "explorer/context": {
        when: string;
        command: string;
        group: string;
    }[];
    "editor/context": {
        when: string;
        command: string;
        group: string;
    }[];
    "editor/title": {
        command: string;
        when: string;
        group: string;
    }[];
    "editor/title/context": {
        command: string;
        when: string;
        group: string;
    }[];
    "view/item/context": ({
        command: string;
        when: string;
        group?: undefined;
    } | {
        command: string;
        when: string;
        group: string;
    })[];
};
export declare const DENDRON_COMMANDS: {
    [key: string]: CommandEntry;
};
export declare const DENDRON_CHANNEL_NAME = "Dendron";
export declare const WORKSPACE_STATE: {
    VERSION: string;
};
export declare enum GLOBAL_STATE {
    VERSION = "dendron.version",
    /**
     * Context that can be used on extension activation to trigger special behavior.
     */
    WORKSPACE_ACTIVATION_CONTEXT = "dendron.workspace_activation_context",
    /**
     * Extension is being debugged
     */
    VSCODE_DEBUGGING_EXTENSION = "dendron.vscode_debugging_extension",
    /**
     * Most Recently Imported Doc
     */
    MRUDocs = "MRUDocs",
    /**
     * @deprecated
     * Checks if initial survey was prompted and submitted.
     */
    INITIAL_SURVEY_SUBMITTED = "dendron.initial_survey_submitted",
    /**
     * @deprecated
     * Checks if lapsed user survey was submitted.
     */
    LAPSED_USER_SURVEY_SUBMITTED = "dendron.lapsed_user_survey_submitted",
    /**
     * @deprecated
     * Chekcs if inactive user survey was submitted.
     */
    INACTIVE_USER_SURVEY_SUBMITTED = "dendron.inactive_user_survey_submitted"
}
/**
 * @deprecated
 */
export declare enum WORKSPACE_ACTIVATION_CONTEXT {
    "NORMAL" = 0,
    "TUTORIAL" = 1,
    "SEED_BROWSER" = 2
}
export type ConfigKey = keyof typeof CONFIG;
export declare const _noteAddBehaviorEnum: string[];
export declare const CONFIG: {
    [key: string]: ConfigEntry;
};
export declare const gdocRequiredScopes: string[];
export declare const Oauth2Pods: string[];
export declare const INCOMPATIBLE_EXTENSIONS: string[];
export type osType = "Linux" | "Darwin" | "Windows_NT";
export declare function isOSType(str: string): str is osType;
export type KeybindingConflict = {
    /**
     * extension id of the extension that has keybinding conflict
     */
    extensionId: string;
    /**
     * command id of the command contributed by `extensionId` that conflicts
     */
    commandId: string;
    /**
     * command id of Dendron command that conflicts with `commandId`
     */
    conflictsWith: string;
    /**
     * os in which this conflict exists. assume all platforms if undefined.
     * this is the os type returned by {@link os.type}
     */
    os?: osType[];
};
export declare const KNOWN_CONFLICTING_EXTENSIONS: string[];
/**
 * List of known keybinding conflicts
 */
export declare const KNOWN_KEYBINDING_CONFLICTS: KeybindingConflict[];
export {};
