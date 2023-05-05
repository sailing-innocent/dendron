import { PROMPT } from "@dendronhq/pods-core";
import yargs from "yargs";
import { CLICommand, CommandCommonProps } from "./base";
import { PodCLIOpts } from "./pod";
import { SetupEngineCLIOpts, SetupEngineResp } from "./utils";
export { CommandCLIOpts as ExportPodCLIOpts };
type CommandCLIOpts = {} & SetupEngineCLIOpts & PodCLIOpts;
type CommandOpts = CommandCLIOpts & CommandCommonProps & {
    podClass: any;
    config: any;
    onPrompt?: (arg0?: PROMPT) => Promise<string | {
        title: string;
    } | undefined>;
} & SetupEngineResp;
type CommandOutput = CommandCommonProps;
export declare class ImportPodCLICommand extends CLICommand<CommandOpts, CommandOutput> {
    constructor();
    buildArgs(args: yargs.Argv<CommandCLIOpts>): void;
    enrichArgs(args: CommandCLIOpts): Promise<import("@dendronhq/common-all").RespV3<import("./pod").PodCommandOpts<any>>>;
    execute(opts: CommandOpts): Promise<CommandOutput>;
}
