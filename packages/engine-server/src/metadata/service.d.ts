import { BacklinkPanelSortOrder, GraphThemeEnum, TreeViewItemLabelTypeEnum } from "@dendronhq/common-all";
export declare enum ShowcaseEntry {
    TryMeetingNotes = "TryMeetingNotes",
    AutocompleteTip = "AutocompleteTip",
    TagsTip = "TagsTip",
    RenameHeader = "RenameHeader",
    TaskManagement = "TaskManagement",
    BlockRefs = "BlockRefs",
    HeaderRefs = "HeaderRefs",
    InsertNoteLink = "InsertNoteLink",
    GraphTheme = "GraphTheme",
    PublishTheme = "PublishTheme",
    PreviewTheme = "PreviewTheme",
    GraphPanel = "GraphPanel",
    BacklinksPanelHover = "BacklinksPanelHover",
    ObsidianImport = "ObsidianImport",
    SettingsUI = "SettingsUI",
    CreateScratchNoteKeybindingTip = "CreateScratchNoteKeybindingTip"
}
/**
 * Survey for users on which prior note-taking tools they've used.
 */
export declare enum PriorTools {
    No = "No",
    Foam = "Foam",
    Roam = "Roam",
    Logseq = "Logseq",
    Notion = "Notion",
    OneNote = "OneNote",
    Obsidian = "Obsidian",
    Evernote = "Evernote",
    GoogleKeep = "Google Keep",
    Confluence = "Confluence",
    Other = "Other"
}
type Metadata = Partial<{
    /**
     * When was dendron first installed
     */
    firstInstall: number;
    /**
     * What was the version of the first install?
     */
    firstInstallVersion: string;
    /**
     * When the first workspace was initialized
     */
    firstWsInitialize: number;
    /**
     * When the last time the lapsed user message was displayed to the user
     */
    lapsedUserMsgSendTime: number;
    /**
     * When the last time the inactive user message was displayed to the user
     */
    inactiveUserMsgSendTime: number;
    /**
     * The status of inactive user message. If submitted, we don't prompt again. If cancelled, we wait 2 weeks to send again.
     */
    inactiveUserMsgStatus: InactvieUserMsgStatusEnum;
    /**
     * The status of lapsed user message.
     */
    lapsedUserSurveyStatus: LapsedUserSurveyStatusEnum;
    /**
     * The status of initial survey.
     */
    initialSurveyStatus: InitialSurveyStatusEnum;
    /**
     * Set if a user has activated a dendron workspace
     */
    dendronWorkspaceActivated: number;
    /**
     * When the user first used lookup
     */
    firstLookupTime: number;
    /**
     * When the user last used lookup
     */
    lastLookupTime: number;
    /**
     * Time when the welcome button was clicked
     */
    welcomeClickedTime: number;
    /**
     * Time when feature showcase mssages have been shown.
     */
    featureShowcase: {
        [key in ShowcaseEntry]?: number;
    };
    /**
     * Global version of Dendron
     */
    version: string;
    /**
     *
     */
    workspaceActivationContext: WorkspaceActivationContext;
    /**
     * Which index of tip-of-the-day the user has last seen so that we can show
     * the user tips that they havent seen.
     */
    tipOfTheDayIndex: number;
    graphTheme?: GraphThemeEnum;
    /**
     * tree view item label type
     */
    treeViewItemLabelType: TreeViewItemLabelTypeEnum;
    backlinksPanelSortOrder: BacklinkPanelSortOrder;
    /**
     * When the user first used Daily Journal command
     */
    firstDailyJournalTime: number;
    /**
     * Responses from this user to the initial survey about prior note-taking
     * tools used.
     */
    priorTools: [PriorTools];
    /**
     * The most recently opened Dendron workspaces
     */
    recentWorkspaces: string[];
    /**
     * One-off setting for tracking whether we've shown the v100 release notes
     * message
     */
    v100ReleaseMessageShown: boolean;
    /**
     * level set by user for local graph view and graph panel
     */
    graphDepth: number;
    /**
     * graph panel show backlinks
     */
    graphPanelShowBacklinks: boolean;
    /**
     * graph panel show outward links
     */
    graphPanelShowOutwardLinks: boolean;
    /**
     * graph panel show hierarchical edges
     */
    graphPanelShowHierarchy: boolean;
}>;
export declare enum InactvieUserMsgStatusEnum {
    submitted = "submitted",
    cancelled = "cancelled"
}
export declare enum InitialSurveyStatusEnum {
    submitted = "submitted",
    cancelled = "cancelled"
}
export declare enum LapsedUserSurveyStatusEnum {
    submitted = "submitted",
    cancelled = "cancelled"
}
export declare enum WorkspaceActivationContext {
    "normal" = 0,
    "tutorial" = 1,
    "seedBrowser" = 2
}
export declare class MetadataService {
    static instance(): MetadataService;
    static metaFilePath(): string;
    deleteMeta(key: keyof Metadata): void;
    getMeta(): Metadata;
    getFeatureShowcaseStatus(key: ShowcaseEntry): number | undefined;
    getGlobalVersion(): string;
    getLapsedUserSurveyStatus(): LapsedUserSurveyStatusEnum | undefined;
    getActivationContext(): WorkspaceActivationContext;
    get TipOfDayIndex(): number | undefined;
    getGraphTheme(): GraphThemeEnum | undefined;
    getTreeViewItemLabelType(): TreeViewItemLabelTypeEnum;
    get BacklinksPanelSortOrder(): BacklinkPanelSortOrder | undefined;
    get priorTools(): PriorTools[] | undefined;
    get RecentWorkspaces(): string[] | undefined;
    get graphDepth(): number | undefined;
    get graphPanelShowBacklinks(): boolean | undefined;
    get graphPanelShowOutwardLinks(): boolean | undefined;
    get graphPanelShowHierarchy(): boolean | undefined;
    setMeta(key: keyof Metadata, value: any): void;
    get v100ReleaseMessageShown(): boolean | undefined;
    get firstInstallVersion(): string | undefined;
    /**
     * Set first install logic
     *  ^o4y7ijuvi5nv
     */
    setInitialInstall(time?: number): void;
    setInitialInstallVersion(version: string): void;
    setFirstWsInitialize(): void;
    setLapsedUserMsgSendTime(): void;
    setDendronWorkspaceActivated(): void;
    setFirstLookupTime(): void;
    setLastLookupTime(): void;
    setInactiveUserMsgSendTime(): void;
    setInactiveUserMsgStatus(value: InactvieUserMsgStatusEnum): void;
    setInitialSurveyStatus(value: InitialSurveyStatusEnum): void;
    setLapsedUserSurveyStatus(value: LapsedUserSurveyStatusEnum): void;
    setGlobalVersion(value: string): void;
    setFeatureShowcaseStatus(key: ShowcaseEntry): void;
    setActivationContext(context: WorkspaceActivationContext): void;
    set TipOfDayIndex(index: number | undefined);
    setGraphTheme(graphTheme: GraphThemeEnum): void;
    set graphDepth(graphDepth: number | undefined);
    setTreeViewItemLabelType(labelType: TreeViewItemLabelTypeEnum): void;
    set BacklinksPanelSortOrder(sortOrder: BacklinkPanelSortOrder | undefined);
    setFirstDailyJournalTime(): void;
    set priorTools(priorTools: PriorTools[] | undefined);
    set v100ReleaseMessageShown(hasShown: boolean | undefined);
    set graphPanelShowBacklinks(showBacklinks: boolean | undefined);
    set graphPanelShowOutwardLinks(showOutwardLinks: boolean | undefined);
    set graphPanelShowHierarchy(showHierarchy: boolean | undefined);
    addToRecentWorkspaces(path: string): void;
}
export {};
