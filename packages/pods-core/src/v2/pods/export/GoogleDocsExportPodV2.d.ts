/// <reference types="node" />
import { DEngineClient, IDendronError, NoteProps, RespV2 } from "@dendronhq/common-all";
import { JSONSchemaType } from "ajv";
import { RateLimiter } from "limiter";
import { ExportPodV2, GoogleDocsV2PodConfig, RunnableGoogleDocsV2PodConfig } from "../../..";
export type GoogleDocsExportReturnType = RespV2<{
    created?: GoogleDocsFields[];
    updated?: GoogleDocsFields[];
}>;
export type GoogleDocsFields = {
    /**
     * Document Id of the exported Note
     */
    documentId?: string;
    /**
     * Revision Id of the exported Note
     */
    revisionId?: string;
    /**
     * id of note
     */
    dendronId?: string;
} | undefined;
type GoogleDocsPayload = {
    content: Buffer;
    documentId?: string;
    name: string;
    dendronId: string;
};
/**
 * GDoc Export Pod (V2 - for compatibility with Pod V2 workflow). Supports only
 * exportNote() for now
 */
export declare class GoogleDocsExportPodV2 implements ExportPodV2<GoogleDocsExportReturnType> {
    private _config;
    private _engine;
    private _wsRoot;
    private _vaults;
    private _port;
    constructor({ podConfig, engine, port, }: {
        podConfig: RunnableGoogleDocsV2PodConfig;
        engine: DEngineClient;
        port: number;
    });
    exportNotes(notes: NoteProps[]): Promise<GoogleDocsExportReturnType>;
    /**
     * Method to check if the accessToken is valid, if not returns a refreshed accessToken
     */
    private checkTokenExpiry;
    /**
     * Method to return the payload for creating/overwriting a google document.
     * @param notes
     * @returns an array of payload for each note.
     */
    getPayloadForNotes(notes: NoteProps[]): Promise<GoogleDocsPayload[]>;
    /**
     * Creates new google documents for given notes.
     */
    createGdoc(opts: {
        docToCreate: GoogleDocsPayload[];
        accessToken: string;
        limiter?: RateLimiter;
        parentFolderId?: string;
    }): Promise<{
        data: GoogleDocsFields[];
        errors: IDendronError[];
    }>;
    /**
     * If a note has document id, overwrite the existing gdoc with the note's content.
     * @param opts
     * @returns
     */
    overwriteGdoc(opts: {
        docToUpdate: GoogleDocsPayload[];
        accessToken: string;
        limiter: RateLimiter;
    }): Promise<{
        data: GoogleDocsFields[];
        errors: IDendronError[];
    }>;
    /**
     * Method to retrieve revisionId of a document. The drive api only returns document id in response.
     */
    getRevisionId(opts: {
        accessToken: string;
        documentId: string;
    }): Promise<any>;
    static config(): JSONSchemaType<GoogleDocsV2PodConfig>;
}
export declare class GoogleDocsUtils {
    static updateNotesWithCustomFrontmatter(records: GoogleDocsFields[], engine: DEngineClient, parentFolderId?: string): Promise<void>;
}
export {};
