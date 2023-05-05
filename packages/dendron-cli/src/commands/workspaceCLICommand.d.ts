/// <reference types="node" />
import { DEngineClient } from "@dendronhq/engine-server";
import yargs from "yargs";
import { CLICommand, CommandCommonProps } from "./base";
import { SetupEngineResp } from "./utils";
type CommandCLIOpts = {
    wsRoot: string;
    vault?: string;
    enginePort?: number;
    cmd: WorkspaceCommands;
};
type CommandOpts = CommandCLIOpts & Omit<SetupEngineResp, "engine"> & {
    engine?: DEngineClient;
} & CommandCommonProps;
type CommandOutput = CommandCommonProps & {
    data?: any;
};
export declare enum WorkspaceCommands {
    PULL = "pull",
    PUSH = "push",
    ADD_AND_COMMIT = "addAndCommit",
    SYNC = "sync",
    REMOVE_CACHE = "removeCache",
    INIT = "init",
    INFO = "info"
}
export { CommandOpts as WorkspaceCLICommandOpts };
export declare class WorkspaceCLICommand extends CLICommand<CommandOpts, CommandOutput> {
    constructor();
    buildArgs(args: yargs.Argv): void;
    enrichArgs(args: CommandCLIOpts): Promise<{
        data: {
            wsRoot: string;
            engine: DEngineClient;
            port: number;
            server: import("../../../api-server/src").Server;
            serverSockets?: Set<import("net").Socket> | undefined;
            vault?: string | undefined;
            enginePort?: number | undefined;
            cmd: WorkspaceCommands;
        };
    }>;
    execute(opts: CommandOpts): Promise<CommandOutput>;
}
