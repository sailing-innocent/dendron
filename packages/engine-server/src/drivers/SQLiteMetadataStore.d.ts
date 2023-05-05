import { DVault, IDataStore, IDendronError, NoteProps, NotePropsByIdDict, NotePropsMeta, ResultAsync, StatusCodes } from "@dendronhq/common-all";
type PrismaClient = any;
export type NoteIndexLightProps = {
    fname: string;
    id: string;
    foo: string;
};
export declare class SQLiteMetadataStore implements IDataStore<string, NotePropsMeta> {
    status: "loading" | "ready";
    constructor({ wsRoot, client, force, }: {
        wsRoot: string;
        client?: PrismaClient;
        force?: boolean;
    });
    dispose(): void;
    get(id: string): Promise<{
        error: import("@dendronhq/common-all").DendronError<StatusCodes | undefined>;
        data?: undefined;
    } | {
        data: NotePropsMeta;
        error?: undefined;
    }>;
    find(opts: any): Promise<{
        data: NotePropsMeta[];
    }>;
    write(key: string, data: NotePropsMeta): Promise<{
        error: Error;
        data?: undefined;
    } | {
        data: string;
        error?: undefined;
    }>;
    delete(key: string): Promise<{
        error: Error;
        data?: undefined;
    } | {
        data: string;
        error?: undefined;
    }>;
    query(_opts: any): ResultAsync<NotePropsMeta[], IDendronError<StatusCodes | undefined>>;
    static prisma(): any;
    static isDBInitialized(): Promise<boolean>;
    /**
     * Check if this vault is initialized in sqlite
     */
    static isVaultInitialized(vault: DVault): Promise<boolean>;
    static createWorkspace(wsRoot: string): Promise<any>;
    static createAllTables(): Promise<any[]>;
    static upsertNote(_note: NoteProps): Promise<void>;
    static bulkInsertAllNotes({ notesIdDict, }: {
        notesIdDict: NotePropsByIdDict;
    }): Promise<{
        query: string;
    } | undefined>;
    static search(query: string): Promise<{
        hits: NoteIndexLightProps[];
        query: string;
    }>;
}
export {};
