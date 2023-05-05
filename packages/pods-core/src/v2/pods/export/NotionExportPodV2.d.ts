import { DEngineClient, IDendronError, NoteProps, RespV2 } from "@dendronhq/common-all";
import { JSONSchemaType } from "ajv";
import { ExportPodV2, NotionV2PodConfig, RunnableNotionV2PodConfig } from "../../..";
export type NotionExportReturnType = RespV2<{
    created?: NotionFields[];
}>;
export type NotionFields = {
    /**
     * Document Id of the notion doc created
     */
    notionId: string;
    /**
     *  dendron id of note
     */
    dendronId: string;
};
/**
 * Notion Export Pod (V2 - for compatibility with Pod V2 workflow).
 */
export declare class NotionExportPodV2 implements ExportPodV2<NotionExportReturnType> {
    private _config;
    constructor({ podConfig }: {
        podConfig: RunnableNotionV2PodConfig;
    });
    exportNotes(notes: NoteProps[]): Promise<NotionExportReturnType>;
    /**
     * Method to convert markdown to Notion Block
     */
    convertMdToNotionBlock: (notes: NoteProps[], parentPageId: string) => {
        dendronId: string;
        block: {
            parent: {
                page_id: string;
            };
            properties: {
                title: {
                    title: {
                        type: string;
                        text: {
                            content: string;
                        };
                    }[];
                };
            };
            children: import("@notionhq/client/build/src/api-types").Block[];
        };
    }[];
    /**
     * Method to create pages in Notion
     */
    createPagesInNotion: (blockPagesArray: any) => Promise<{
        data: NotionFields[];
        errors: IDendronError[];
    }>;
    static config(): JSONSchemaType<NotionV2PodConfig>;
}
export declare class NotionUtils {
    static updateNotionIdForNewlyCreatedNotes: (records: NotionFields[], engine: DEngineClient) => Promise<void>;
}
