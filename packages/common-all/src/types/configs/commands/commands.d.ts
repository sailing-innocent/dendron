import { CopyNoteLinkConfig } from ".";
import { InsertNoteIndexConfig } from "./insertNoteIndex";
import { InsertNoteLinkConfig } from "./insertNoteLink";
import { LookupConfig } from "./lookup";
import { RandomNoteConfig } from "./randomNote";
/**
 * Namespace for all command related configurations
 */
export type DendronCommandConfig = {
    lookup: LookupConfig;
    randomNote: RandomNoteConfig;
    insertNoteLink: InsertNoteLinkConfig;
    insertNoteIndex: InsertNoteIndexConfig;
    copyNoteLink: CopyNoteLinkConfig;
    /**
     * Default template hiearchy used when running commands like `Apply template`
     */
    templateHierarchy?: string;
};
/**
 * Generates default {@link DendronCommandConfig} using
 * respective default config generators that each command config implements.
 * @returns DendronCommandConfig
 */
export declare function genDefaultCommandConfig(): DendronCommandConfig;
