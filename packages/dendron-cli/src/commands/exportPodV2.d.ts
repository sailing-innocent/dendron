import { DEngineClient, NoteProps } from "@dendronhq/common-all";
import { AirtableExportPodV2, AirtableExportReturnType, GoogleDocsExportPodV2, GoogleDocsExportReturnType, JSONExportPodV2, JSONExportReturnType, MarkdownExportPodV2, MarkdownExportReturnType, NotionExportPodV2, NotionExportReturnType, PodExportScope, PodV2Types, RunnableGoogleDocsV2PodConfig } from "@dendronhq/pods-core";
import yargs from "yargs";
import { CLICommand, CommandCommonProps } from "./base";
import { PodCLIOpts } from "./podsV2";
import { SetupEngineCLIOpts, SetupEngineResp } from "./utils";
export { CommandCLIOpts as ExportPodV2CLIOpts };
type CommandCLIOpts = {} & SetupEngineCLIOpts & PodCLIOpts;
type CommandOpts = CommandCLIOpts & {
    config: any;
    payload: NoteProps[];
} & SetupEngineResp & CommandCommonProps;
type CommandOutput = CommandCommonProps;
export declare class ExportPodV2CLICommand extends CLICommand<CommandOpts, CommandOutput> {
    constructor();
    buildArgs(args: yargs.Argv<CommandCLIOpts>): void;
    enrichArgs(args: CommandCLIOpts): Promise<import("@dendronhq/common-all").RespV3<import("./podsV2").PodCommandOpts<any>>>;
    /**
     * Method to instantiate the pod instance with the
     * passed in configuration
     */
    createPod(config: any, engine: DEngineClient): AirtableExportPodV2 | GoogleDocsExportPodV2 | MarkdownExportPodV2 | NotionExportPodV2 | JSONExportPodV2;
    execute(opts: CommandOpts): Promise<CommandOutput>;
    onExportComplete(opts: {
        exportReturnValue: any;
        podType: PodV2Types;
        engine: DEngineClient;
        config: any;
    }): Promise<void>;
    onAirtableExportComplete(opts: {
        exportReturnValue: AirtableExportReturnType;
        engine: DEngineClient;
        config: any;
    }): Promise<void>;
    onGoogleDocsExportComplete(opts: {
        exportReturnValue: GoogleDocsExportReturnType;
        engine: DEngineClient;
        config: RunnableGoogleDocsV2PodConfig;
    }): Promise<void>;
    onNotionExportComplete(opts: {
        exportReturnValue: NotionExportReturnType;
        engine: DEngineClient;
    }): Promise<void>;
    onMarkdownExportComplete(opts: {
        exportReturnValue: MarkdownExportReturnType;
        config: any;
    }): Promise<void>;
    onJSONExportComplete(opts: {
        exportReturnValue: JSONExportReturnType;
        config: any;
    }): Promise<void>;
    multiNoteExportCheck(opts: {
        destination: string;
        exportScope: PodExportScope;
    }): void;
}
