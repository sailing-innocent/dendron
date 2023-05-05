import { ImportPod, ImportPodConfig, ImportPodPlantOpts, PROMPT } from "../basev3";
import { JSONSchemaType } from "ajv";
import { DVault, NoteProps, DEngineClient } from "@dendronhq/common-all";
type GDocImportPodCustomOpts = {
    /**
     * google docs personal access token
     */
    accessToken: string;
    /**
     * google docs personal refresh token
     */
    refreshToken: string;
    /**
     * expiration time of access token
     */
    expirationTime: number;
    /**
     * import comments from the doc in text or json format
     */
    importComments?: ImportComments;
    /**
     * get confirmation before overwriting existing note
     */
    confirmOverwrite?: boolean;
};
type ImportComments = {
    enable: boolean;
    format?: string;
};
declare enum ErrMsg {
    TIMEOUT = "timeout"
}
export type GDocImportPodConfig = ImportPodConfig & GDocImportPodCustomOpts;
export type GDocImportPodPlantOpts = ImportPodPlantOpts;
export declare class GDocImportPod extends ImportPod<GDocImportPodConfig> {
    static id: string;
    static description: string;
    get config(): JSONSchemaType<GDocImportPodConfig>;
    /**
     * sends Request to drive API to get document id of the document name
     */
    getDocumentId: (accessToken: string, documentName: string) => Promise<string>;
    /**
     * sends request to drive API to fetch docs of mime type document
     */
    fetchDocListFromDrive: (accessToken: string) => Promise<import("axios").AxiosResponse<any>>;
    /**
     * gets all document List present in google docs and create HashMap of doc Id and Name
     */
    getAllDocuments: (accessToken: string) => Promise<{
        docIdsHashMap: any;
        error: ErrMsg | undefined;
    }>;
    getDataFromGDoc: (opts: {
        documentId: string;
        hierarchyDestination: string;
        accessToken: string;
        importComments?: ImportComments;
    }, config: ImportPodConfig, assetDir: string) => Promise<Partial<NoteProps>>;
    getCommentsFromDoc: (opts: Partial<GDocImportPodConfig> & {
        documentId: string;
    }, response: Partial<NoteProps>) => Promise<Partial<NoteProps>>;
    prettyComment: (comments: any) => string;
    _docs2Notes(entry: Partial<NoteProps>, opts: Pick<ImportPodConfig, "fnameAsId"> & {
        vault: DVault;
    }): Promise<NoteProps>;
    createNote: (opts: {
        note: NoteProps;
        engine: DEngineClient;
        wsRoot: string;
        vault: DVault;
        confirmOverwrite?: boolean | undefined;
        onPrompt?: ((arg0?: PROMPT) => Promise<{
            title: string;
        } | undefined>) | undefined;
        importComments?: ImportComments | undefined;
    }) => Promise<NoteProps | undefined>;
    plant(opts: GDocImportPodPlantOpts): Promise<{
        importedNotes: NoteProps[];
    }>;
}
export {};
