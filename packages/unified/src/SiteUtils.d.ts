import { DendronPublishingConfig, DuplicateNoteBehavior, DVault, HierarchyConfig, IDendronError, DendronConfig, NoteDicts, NoteProps, NotePropsMeta } from "@dendronhq/common-all";
export declare class SiteUtils {
    static canPublish(opts: {
        note: NoteProps;
        config: DendronConfig;
        wsRoot: string;
        vaults: DVault[];
    }): boolean;
    static isPublished(opts: {
        note: NoteProps;
        config: DendronConfig;
        wsRoot: string;
        vaults: DVault[];
    }): boolean;
    /**
     * Creates a placeholder note that can be used for rendering a 403 error
     * message.
     */
    static create403StaticNote(opts: {
        vaults: DVault[];
    }): NoteProps;
    static createSiteOnlyNotes(opts: {
        vaults: DVault[];
    }): NoteProps[];
    /**
     * Apply custom frontmatter and formatting to note
     */
    static cleanNote({ note, hConfig, }: {
        note: NoteProps;
        hConfig: HierarchyConfig;
    }): {
        id: string;
        title: string;
        desc: string;
        updated: number;
        created: number;
        config?: Partial<{
            global: Partial<Pick<import("@dendronhq/common-all").DendronGlobalConfig, "enableChildLinks" | "enablePrettyRefs" | "enableBackLinks">>;
        }> | undefined;
        fname: string;
        links: import("@dendronhq/common-all").DLink[];
        anchors: {
            [index: string]: import("@dendronhq/common-all").DNoteAnchorPositioned | undefined;
        };
        type: import("@dendronhq/common-all").DNodeType;
        stub?: boolean | undefined;
        schemaStub?: boolean | undefined;
        parent: string | null;
        children: string[];
        data: any;
        body: string;
        custom?: any;
        schema?: {
            moduleId: string;
            /**
             * Apply custom frontmatter and formatting to note
             */
            schemaId: string;
        } | undefined;
        vault: DVault;
        contentHash?: string | undefined;
        /**
         * Apply custom frontmatter and formatting to note
         */
        color?: string | undefined;
        tags?: string | string[] | undefined;
        image?: import("@dendronhq/common-all").DNodeImage | undefined;
        traits?: string[] | undefined;
    };
    static getConfigForHierarchy(opts: {
        config: DendronConfig;
        noteOrName: NoteProps | string;
    }): HierarchyConfig;
    static getSiteUrlRootForVault({ vault, config, }: {
        vault: DVault;
        config: DendronConfig;
    }): {
        url?: string;
        index?: string;
    };
    static getSitePrefixForNote(config: DendronConfig): string;
    static getSiteUrlPathForNote({ pathValue, pathAnchor, config, addPrefix, note, }: {
        pathValue?: string;
        pathAnchor?: string;
        config: DendronConfig;
        addPrefix?: boolean;
        note?: NoteProps;
    }): string;
    static handleDup(opts: {
        dupBehavior?: DuplicateNoteBehavior;
        fname: string;
        config: DendronConfig;
        noteCandidates: NoteProps[];
        noteDict: NoteDicts;
        vaults: DVault[];
        wsRoot: string;
    }): NoteProps | undefined;
    /**
     * Is the current note equivalent ot the index of the published site?
     * @returns
     */
    static isIndexNote({ indexNote, note, }: {
        indexNote?: string;
        note: NotePropsMeta;
    }): boolean;
    static validateConfig(sconfig: DendronPublishingConfig): {
        error?: IDendronError;
    };
}
