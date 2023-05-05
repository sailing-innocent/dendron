import { ImportPod, ImportPodConfig, ImportPodPlantOpts } from "../basev3";
import { JSONSchemaType } from "ajv";
import { Conflict, DEngineClient, DVault, MergeConflictOptions, NoteProps, PodConflictResolveOpts } from "@dendronhq/common-all";
type OrbitImportPodCustomOpts = {
    /**
     * orbit workspace slug
     */
    workspaceSlug: string;
    /**
     * orbit person access token
     */
    token: string;
};
type OrbitImportPodConfig = ImportPodConfig & OrbitImportPodCustomOpts;
type MembersOpts = {
    orbitId: string;
    name: string;
    github: string;
    discord: string;
    linkedin: string;
    twitter: string;
    hn: string;
    website: string;
    email: string;
};
export type OrbitImportPodPlantOpts = ImportPodPlantOpts;
export declare class OrbitImportPod extends ImportPod<OrbitImportPodConfig> {
    static id: string;
    static description: string;
    get config(): JSONSchemaType<OrbitImportPodConfig>;
    /**
     * method to fetch all the members for an orbit workspace
     * @param opts
     * @returns members
     */
    getMembersFromOrbit: (opts: OrbitImportPodCustomOpts & {
        link: string;
    }) => Promise<any>;
    /**
     * method to parse members as notes.
     * - creates new noteprops if note is not already there in the vault
     * - writes in a temporary hierarchy if the note is conflicted
     * - updates previously imported notes if there are no conflicts
     */
    membersToNotes(opts: {
        members: MembersOpts[];
        vault: DVault;
        engine: DEngineClient;
        wsRoot: string;
        config: ImportPodConfig;
    }): Promise<{
        create: NoteProps[];
        conflicts: Conflict[];
    }>;
    getNameFromEmail(email: string): string;
    /**
     * returns all the conflicted entries in custom.social FM field of note
     */
    getConflictedData: (opts: {
        note: NoteProps;
        social: Partial<MembersOpts>;
    }) => string[];
    /**
     * updates the social fields of a note's FM
     */
    updateNoteData: (opts: {
        note: NoteProps;
        social: Partial<MembersOpts>;
        engine: DEngineClient;
    }) => Promise<void>;
    onConflict(opts: {
        conflicts: Conflict[];
        index: number;
        handleConflict: (conflict: Conflict, conflictResolveOpts: PodConflictResolveOpts) => Promise<string | undefined>;
        engine: DEngineClient;
        conflictResolvedNotes: NoteProps[];
        conflictResolveOpts: PodConflictResolveOpts;
    }): Promise<any>;
    validateMergeConflictResponse(choice: number, options: string[]): true | "Invalid Choice! Choose 0/1";
    getMergeConflictOptions(): MergeConflictOptions[];
    getMergeConflictText(conflict: Conflict): string;
    plant(opts: OrbitImportPodPlantOpts): Promise<{
        importedNotes: any[];
    }>;
}
export {};
