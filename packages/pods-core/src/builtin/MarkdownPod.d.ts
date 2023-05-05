import { NoteProps } from "@dendronhq/common-all";
import { DendronASTNode, MDUtilsV5 } from "@dendronhq/unified";
import { Item } from "klaw";
import { ExportPod, ExportPodPlantOpts, ExportPodConfig, ImportPod, ImportPodConfig, ImportPodPlantOpts, PublishPod, PublishPodPlantOpts, PublishPodConfig } from "../basev3";
import { JSONSchemaType } from "ajv";
export type MarkdownImportPodPlantOpts = ImportPodPlantOpts;
type MarkdownImportPodConfig = ImportPodConfig & {
    noAddUUID?: boolean;
    indexName?: string;
    importFrontmatter?: boolean;
    frontmatterMapping?: {
        [key: string]: any;
    };
};
export type MarkdownImportPodResp = {
    importedNotes: NoteProps[];
    errors: Item[];
};
type DItem = Item & {
    data?: any;
    body?: string;
    entries: DItem[];
};
type HierarichalDict = {
    [k: string]: NoteProps[];
};
export declare class MarkdownImportPod extends ImportPod<MarkdownImportPodConfig> {
    static id: string;
    static description: string;
    get config(): JSONSchemaType<MarkdownImportPodConfig>;
    /**
     * Reads all files
     * @param root
     * @returns dictionary of {@link DItem[]}
     */
    _collectItems(root: string): Promise<{
        items: DItem[];
        errors: DItem[];
    }>;
    /**
     * Classify {@link DItem} into notes and assets. Turns directories into notes
     * @param items
     * @returns
     */
    buildFileDirAssetDicts(items: DItem[]): Promise<{
        engineFileDict: {
            [k: string]: DItem;
        };
        assetFileDict: {
            [k: string]: DItem;
        };
    }>;
    /** Collects all notes and copies assets in the given files/folders, and creates asset summary notes.
     *
     * @returns The created notes and a map of asset paths to imported paths.
     */
    private collectNotesCopyAssets;
    hDict2Notes(hdict: HierarichalDict, config: MarkdownImportPodConfig): NoteProps[];
    /** Cleans up a link following Dendron best practices, converting slashes to dots and spaces to dashes. */
    private static cleanLinkValue;
    static updateLinks({ note, siblingNotes, tree, proc, }: {
        note: NoteProps;
        siblingNotes: NoteProps[];
        tree: DendronASTNode;
        proc: ReturnType<typeof MDUtilsV5["procRemarkFull"]>;
    }): Promise<void>;
    static cleanAssetPath(path: string): string;
    /** Gets all links to assets. */
    static updateAssetLinks({ note, tree, assetMap, proc, }: {
        note: NoteProps;
        tree: DendronASTNode;
        assetMap: Map<string, string>;
        proc: ReturnType<typeof MDUtilsV5["procRemarkFull"]>;
    }): Promise<void>;
    /**
     * Method to import frontmatter of note. Imports all FM in note.custom,
     * In case of conflict in keys of dendron and imported note, checks frontmatterMapping provided in the
     * config. If not provided, concatenates '_imported' in imported FM keys.
     */
    handleFrontmatter(opts: {
        frontmatterMapping?: {
            [key: string]: any;
        };
        note: NoteProps;
    }): void;
    plant(opts: MarkdownImportPodPlantOpts): Promise<MarkdownImportPodResp>;
}
type MarkdownPublishPodConfig = PublishPodConfig & {
    wikiLinkToURL?: boolean;
};
export declare class MarkdownPublishPod extends PublishPod<MarkdownPublishPodConfig> {
    static id: string;
    static description: string;
    get config(): JSONSchemaType<MarkdownPublishPodConfig>;
    plant(opts: PublishPodPlantOpts): Promise<string>;
}
/**
 *
 */
export declare class MarkdownExportPod extends ExportPod {
    static id: string;
    static description: string;
    get config(): JSONSchemaType<ExportPodConfig>;
    plant(opts: ExportPodPlantOpts): Promise<{
        notes: NoteProps[];
    }>;
}
export {};
