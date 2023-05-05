import { DVault, NoteProps } from "@dendronhq/common-all";
import { ExportPod, ExportPodPlantOpts, ExportPodConfig, ImportPod, ImportPodConfig, ImportPodPlantOpts, PublishPod, PublishPodPlantOpts, PublishPodConfig } from "../basev3";
import { JSONSchemaType } from "ajv";
export type JSONImportPodPlantOpts = ImportPodPlantOpts;
export declare class JSONImportPod extends ImportPod {
    static id: string;
    static description: string;
    get config(): JSONSchemaType<ImportPodConfig>;
    plant(opts: JSONImportPodPlantOpts): Promise<{
        importedNotes: NoteProps[];
    }>;
    _entries2Notes(entries: Partial<NoteProps>[], opts: Pick<ImportPodConfig, "concatenate" | "destName"> & {
        vault: DVault;
    }): Promise<NoteProps[]>;
}
export declare class JSONPublishPod extends PublishPod {
    static id: string;
    static description: string;
    get config(): JSONSchemaType<PublishPodConfig>;
    plant(opts: PublishPodPlantOpts): Promise<string>;
}
export declare class JSONExportPod extends ExportPod {
    static id: string;
    static description: string;
    get config(): JSONSchemaType<ExportPodConfig>;
    plant(opts: ExportPodPlantOpts): Promise<{
        notes: NoteProps[];
    }>;
}
