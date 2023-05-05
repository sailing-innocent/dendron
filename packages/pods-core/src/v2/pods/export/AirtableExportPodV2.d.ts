import Airtable, { FieldSet, Records } from "@dendronhq/airtable";
import { DEngineClient, NoteProps, RespV2 } from "@dendronhq/common-all";
import { JSONSchemaType } from "ajv";
import { ExportPodV2, PersistedAirtablePodConfig, RunnableAirtableV2PodConfig } from "../../..";
export type AirtableExportPodV2Constructor = {
    airtable: Airtable;
    config: RunnableAirtableV2PodConfig;
    engine: DEngineClient;
};
export type AirtableExportReturnType = RespV2<{
    /**
     * New rows/records created in Airtable
     */
    created?: Records<FieldSet>;
    /**
     * Existing rows/records that were updated in Airtable
     */
    updated?: Records<FieldSet>;
}>;
/**
 * Airtable Export Pod (V2 - for compatibility with Pod V2 workflow). This pod
 * will export data to a table row in Airtable.
 */
export declare class AirtableExportPodV2 implements ExportPodV2<AirtableExportReturnType> {
    private _config;
    private _airtableBase;
    private _engine;
    constructor({ airtable, config, engine }: AirtableExportPodV2Constructor);
    private cleanNotes;
    exportNotes(input: NoteProps[]): Promise<AirtableExportReturnType>;
    /**
     * Get mapping of fields that will be updated in airtable
     * @param notes
     * @returns
     */
    private getPayloadForNotes;
    static config(): JSONSchemaType<PersistedAirtablePodConfig>;
}
