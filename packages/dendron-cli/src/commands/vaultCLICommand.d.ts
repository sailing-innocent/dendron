/// <reference types="node" />
import { DVault, VaultRemoteSource } from "@dendronhq/common-all";
import yargs from "yargs";
import { CLICommand, CommandCommonProps } from "./base";
import { SetupEngineResp } from "./utils";
type CommandCLIOpts = {
    wsRoot: string;
    vault?: string;
    enginePort?: number;
    vaultPath: string;
    noAddToConfig?: boolean;
    cmd: VaultCommands;
    remoteUrl?: string;
    type?: VaultRemoteSource;
};
type CommandOpts = CommandCLIOpts & SetupEngineResp & CommandCommonProps;
export declare enum VaultCommands {
    CREATE = "create",
    CONVERT = "convert"
}
export { CommandOpts as VaultCLICommandOpts };
export declare class VaultCLICommand extends CLICommand<CommandOpts> {
    constructor();
    buildArgs(args: yargs.Argv): void;
    enrichArgs(args: CommandCLIOpts): Promise<{
        data: {
            wsRoot: string;
            engine: import("@dendronhq/engine-server").DEngineClient;
            port: number;
            server: import("../../../api-server/src").Server;
            serverSockets?: Set<import("net").Socket> | undefined;
            vault?: string | undefined;
            enginePort?: number | undefined;
            vaultPath: string;
            noAddToConfig?: boolean | undefined;
            cmd: VaultCommands;
            remoteUrl?: string | undefined;
            type?: VaultRemoteSource | undefined;
        };
    }>;
    execute(opts: CommandOpts): Promise<{
        vault: DVault;
        error: undefined;
    }>;
}
