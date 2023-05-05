import Fuse from "fuse.js";
import { DEngineMode, NoteProps, NotePropsByIdDict, NotePropsMeta, SchemaModuleDict, SchemaModuleProps, SchemaProps } from ".";
import { NoteChangeEntry } from "./types";
import { DVault } from "./types/DVault";
export type NoteIndexProps = {
    id: string;
    title: string;
    fname: string;
    vault: DVault;
    updated: number;
    stub?: boolean;
};
/** https://fusejs.io/examples.html#extended-search */
export declare const FuseExtendedSearchConstants: {
    PrefixExactMatch: string;
};
declare function createFuse<T>(initList: T[], opts: Fuse.IFuseOptions<T> & {
    preset: "schema" | "note";
}, index?: Fuse.FuseIndex<T>): Fuse<T>;
export declare function createFuseNote(publishedNotes: NotePropsByIdDict | NoteProps[], overrideOpts?: Partial<Fuse.IFuseOptions<NoteProps>>, index?: Fuse.FuseIndex<NoteProps>): Fuse<NoteProps>;
export declare function createSerializedFuseNoteIndex(publishedNotes: NotePropsByIdDict | NoteProps[], overrideOpts?: Partial<Parameters<typeof createFuse>[1]>): {
    keys: readonly string[];
    records: Fuse.FuseIndexRecords;
};
export type FuseNote = Fuse<NoteProps>;
export type FuseNoteIndex = Fuse.FuseIndex<NoteProps>;
export type SerializedFuseIndex = ReturnType<typeof createSerializedFuseNoteIndex>;
type FuseEngineOpts = {
    mode?: DEngineMode;
    /** If specified must be within 0-1 range. */
    fuzzThreshold: number;
};
export declare const getCleanThresholdValue: (configThreshold: number) => number;
export declare class FuseEngine {
    /**
     * Characters that are specially treated by FuseJS search
     * Reference https://fusejs.io/examples.html#extended-search
     *
     * Includes '*' which is not specially treated by FuseJS but we currently
     * map '*' to ' ' which specially treated by FuseJS.
     */
    private static readonly SPECIAL_QUERY_CHARACTERS;
    notesIndex: Fuse<NoteIndexProps>;
    schemaIndex: Fuse<SchemaProps>;
    private readonly threshold;
    constructor(opts: FuseEngineOpts);
    querySchema({ qs }: {
        qs: string;
    }): SchemaProps[];
    /**
     * If qs = "", return root note
     * @param qs query string.
     * @param onlyDirectChildren query for direct children only.
     * @param originalQS original query string that was typed by the user.
     * @returns
     */
    queryNote({ qs, onlyDirectChildren, originalQS, }: {
        qs: string;
        onlyDirectChildren?: boolean;
        originalQS: string;
    }): NoteIndexProps[];
    private filterByThreshold;
    replaceSchemaIndex(schemas: SchemaModuleDict): Promise<void>;
    replaceNotesIndex(notes: NotePropsByIdDict): Promise<void>;
    updateNotesIndex(noteChanges: NoteChangeEntry[]): Promise<void[]>;
    removeNoteFromIndex(note: NotePropsMeta): void;
    addNoteToIndex(note: NotePropsMeta): void;
    addSchemaToIndex(schema: SchemaModuleProps): void;
    removeSchemaFromIndex(smod: SchemaModuleProps): void;
    /**
     * Fuse does not support '*' as a wildcard. This replaces the `*` to a fuse equivalent
     * to make the engine do the right thing
     */
    static formatQueryForFuse({ qs }: {
        qs: string;
    }): string;
    /**
     * When there are multiple items with exact same score apply sorting
     * within that group of elements. (The items with better match scores
     * should still come before elements with worse match scores).
     * */
    static sortResults({ results, originalQS, }: {
        results: Fuse.FuseResult<NoteIndexProps>[];
        originalQS: string;
    }): Fuse.FuseResult<NoteIndexProps>[];
    private postQueryFilter;
    /**
     * Returns true when string contains characters that FuseJS treats as special characters.
     * */
    static doesContainSpecialQueryChars(str: string): boolean;
}
export {};
