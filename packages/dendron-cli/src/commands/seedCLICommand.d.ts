/// <reference types="node" />
import { DendronError, SeedCommands, SeedConfig } from "@dendronhq/common-all";
import { SeedInitMode } from "@dendronhq/engine-server";
import yargs from "yargs";
import { CLICommand, CommandCommonProps } from "./base";
import { SetupEngineOpts } from "./utils";
type CommandCLIOpts = {
    wsRoot: string;
    vault?: string;
    cmd: SeedCommands;
    id: string;
    mode?: SeedInitMode;
    config?: SeedConfig;
    registryFile?: string;
};
type CommandOpts = CommandCLIOpts & SetupEngineOpts & CommandCommonProps;
type CommandOutput = Partial<{
    error?: DendronError;
    data: any;
}>;
export { CommandOpts as SeedCLICommandOpts };
export declare class SeedCLICommand extends CLICommand<CommandOpts, CommandOutput> {
    constructor();
    buildArgs(args: yargs.Argv): void;
    enrichArgs(args: CommandCLIOpts): Promise<{
        data: {
            wsRoot: string;
            engine: import("@dendronhq/common-all").DEngineClient;
            port: number;
            server: import("../../../api-server/src").Server;
            serverSockets?: Set<import("net").Socket> | undefined;
            vault?: string | undefined;
            cmd: SeedCommands;
            id: string;
            mode?: SeedInitMode | undefined;
            config?: SeedConfig | undefined;
            registryFile?: string | undefined;
        };
    }>;
    execute(opts: CommandOpts): Promise<CommandOutput>;
}
