import { ImportPod, ImportPodConfig, ImportPodPlantOpts, PublishPod, PublishPodConfig, PublishPodPlantOpts } from "../basev3";
import { JSONSchemaType } from "ajv";
import { ShowMessageTypes } from "../utils";
import { DVault, NoteProps, DEngineClient } from "@dendronhq/common-all";
type GithubIssueImportPodCustomOpts = {
    /**
     * owner of the repository
     */
    owner: string;
    /**
     * github repository to import from
     */
    repository: string;
    /**
     * import issues created before this date
     */
    endDate?: string;
    /**
     * import issues created after this date
     */
    startDate?: string;
    /**
     * status of issue open/closed
     */
    status: string;
    /**
     * github personal access token
     */
    token: string;
    /**
     * name of hierarchy to import into
     */
    fname: string;
};
type GithubAPIOpts = GithubIssueImportPodCustomOpts & {
    created?: string;
    afterCursor?: string;
};
type GithubIssueImportPodConfig = ImportPodConfig & GithubIssueImportPodCustomOpts;
export type GithubIssueImportPodPlantOpts = ImportPodPlantOpts;
export declare class GithubIssueImportPod extends ImportPod<GithubIssueImportPodConfig> {
    static id: string;
    static description: string;
    get config(): JSONSchemaType<GithubIssueImportPodConfig>;
    /**
     * method to fetch issues from github graphql api
     */
    getDataFromGithub: (opts: Partial<GithubAPIOpts>) => Promise<unknown>;
    _issues2Notes(entries: any, opts: Pick<ImportPodConfig, "concatenate" | "destName" | "fnameAsId"> & {
        vault: DVault;
    }): Promise<NoteProps[]>;
    /**
     * method to add fromtmatter to notes: url, status and tags
     */
    addFrontMatterToData: (data: any, fname: string, config: ImportPodConfig) => any;
    /**
     * method to get notes that are not already present in the vault
     */
    getNewNotes(notes: NoteProps[], engine: DEngineClient, vault: DVault): Promise<NoteProps[]>;
    /**
     * method to update the notes whose status has changed
     */
    private getUpdatedNotes;
    plant(opts: GithubIssueImportPodPlantOpts): Promise<{
        importedNotes: NoteProps[];
    }>;
}
export declare enum GITHUBMESSAGE {
    INVALID_TAG = "Github: The labels in the tag does not belong to selected repository",
    INVALID_CATEGORY = "Github: Invalid category",
    INVALID_MILESTONE = "Github: Invalid milestone",
    ISSUE_CREATED = "Github: Issue Created",
    ISSUE_UPDATED = "Github: Issue Updated",
    DISCUSSION_CREATED = "Github: Discussion Created",
    INVALID_ASSIGNEE = "Github: Invalid assignee username"
}
type GithubIssuePublishPodCustomOpts = {
    /**
     * owner of the repository
     */
    owner: string;
    /**
     * github repository to import from
     */
    repository: string;
    /**
     * github personal access token
     */
    token: string;
    /**
     * if set to false, starts a discussion without the contents of note body
     */
    includeNoteBodyInDiscussion?: boolean;
    /**
     * aliasMapping for frontmatter
     */
    aliasMapping?: AliasMapping;
};
type AliasMapping = {
    assignees: AliasMappingLvl2;
    status: AliasMappingLvl2;
};
type AliasMappingLvl2 = {
    value?: {
        [key: string]: string;
    };
    alias?: string;
};
type GithubIssuePublishPodConfig = PublishPodConfig & GithubIssuePublishPodCustomOpts;
export declare class GithubIssuePublishPod extends PublishPod<GithubIssuePublishPodConfig> {
    static id: string;
    static description: string;
    get config(): JSONSchemaType<GithubIssuePublishPodConfig>;
    /**
     * method to get data of a repository from github.
     *
     */
    getDataFromGithub: (opts: Partial<GithubIssuePublishPodConfig>) => Promise<any>;
    /**
     * method to update the milestone and assignee of issue in github
     */
    updateMilestoneAndAssignee: (opts: {
        issueID: string;
        token: string;
        milestoneId: string;
        assigneeIds: string[];
    }) => Promise<void>;
    /**
     * method to update the issue in github
     * Only users with push access can set labels, assignees and milestone for issues. Otherwise dropped silently.
     */
    updateIssue: (opts: {
        issueID: string;
        token: string;
        status: string;
        labelIDs: string[];
        milestoneId: string;
        showMessage: ShowMessageTypes;
        assigneeIds: string[];
    }) => Promise<string>;
    /**
     * method to create an issue in github
     * Only users with push access can set labels, milestone and assignees for new issues. Labels, Assignees and Milestone are not dropped silently in Graphql createIssue.
     */
    createIssue: (opts: {
        token: string;
        labelIDs: string[];
        note: NoteProps;
        engine: DEngineClient;
        milestoneId: string;
        showMessage: ShowMessageTypes;
        assigneeIds: string[];
        repositoryId: string;
    }) => Promise<string>;
    /**
     * method to create a discussion in github
     */
    createDiscussion: (opts: {
        token: string;
        note: NoteProps;
        engine: DEngineClient;
        categoryId: string;
        includeNoteBodyInDiscussion: boolean;
        showMessage: ShowMessageTypes;
        repositoryId: string;
    }) => Promise<string>;
    plant(opts: PublishPodPlantOpts): Promise<string>;
}
export {};
