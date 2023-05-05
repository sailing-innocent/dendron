import { InputArgs } from "@dendronhq/dendron-viz";
import { Argv } from "yargs";
import { CLICommand, CommandCommonProps } from "./base";
import { SetupEngineResp } from "./utils";
type CommandOpts = InputArgs & SetupEngineResp & CommandCommonProps;
export { CommandOpts as VisualizeCLICommandOpts };
export declare class VisualizeCLICommand extends CLICommand {
    constructor();
    buildArgs(args: Argv): void;
    enrichArgs(args: any): Promise<{
        data: any;
    }>;
    execute(opts: CommandOpts): Promise<{
        exit: boolean;
    }>;
}
