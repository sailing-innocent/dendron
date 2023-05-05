import { NoteProps } from "@dendronhq/common-all";
import type { Page } from "@notionhq/client/build/src/api-types";
import { Client } from "@notionhq/client";
import { ExportPod, ExportPodPlantOpts, ExportPodConfig } from "../basev3";
import { JSONSchemaType } from "ajv";
type NotionExportPodCustomOpts = {
    apiKey: string;
    vault: string;
};
export type NotionExportConfig = ExportPodConfig & NotionExportPodCustomOpts;
export declare class NotionExportPod extends ExportPod<NotionExportConfig> {
    static id: string;
    static description: string;
    get config(): JSONSchemaType<NotionExportConfig>;
    /**
     * Method to create pages in Notion
     */
    createPagesInNotion: (blockPagesArray: any, notion: Client) => Promise<any[]>;
    /**
     * Method to convert markdown to Notion Block
     */
    convertMdToNotionBlock: (notes: NoteProps[], pageId: string) => {
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
    }[];
    /**
     * Method to get page name of a Notion Page
     */
    getPageName: (page: Page) => string;
    /**
     * Method to get all the pages from Notion
     */
    getAllNotionPages: (notion: Client, progressOpts: any) => Promise<any>;
    plant(opts: ExportPodPlantOpts): Promise<{
        notes: NoteProps[];
    }>;
}
export {};
