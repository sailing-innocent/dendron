import { NoteProps, RespV2 } from "@dendronhq/common-all";
import { JSONSchemaType } from "ajv";
import { ExportPodV2 } from "../../..";
import { JSONV2PodConfig, RunnableJSONV2PodConfig } from "../..";
/**
 * JSON Export Pod (V2 - for compatibility with Pod V2 workflow).
 */
export type JSONExportReturnType = RespV2<{
    exportedNotes?: string | NoteProps[];
}>;
export declare class JSONExportPodV2 implements ExportPodV2<JSONExportReturnType> {
    private _config;
    constructor({ podConfig }: {
        podConfig: RunnableJSONV2PodConfig;
    });
    exportNotes(input: NoteProps[]): Promise<JSONExportReturnType>;
    static config(): JSONSchemaType<JSONV2PodConfig>;
}
