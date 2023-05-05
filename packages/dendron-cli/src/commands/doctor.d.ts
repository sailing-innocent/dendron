/// <reference types="node" />
import { NoteProps } from "@dendronhq/common-all";
import { DoctorActionsEnum } from "@dendronhq/engine-server";
import yargs from "yargs";
import { CLICommand, CommandCommonProps } from "./base";
import { SetupEngineCLIOpts, SetupEngineOpts } from "./utils";
type CommandCLIOpts = {
    action: DoctorActionsEnum;
    query?: string;
    /**
     * pass in note candidates directly to
     * limit what notes should be used in the command.
     */
    candidates?: NoteProps[];
    limit?: number;
    dryRun?: boolean;
    /**
     * When set to true, calls process.exit when command is done.
     *
     * This is done for CLI commands to keep the server from running
     * forever. when run from the plugin, we re-use the existing server
     * so we don't want it to exit.
     */
    exit?: boolean;
    /**
     * pod Id used to export Note(s) to Airtable
     */
    podId?: string;
} & SetupEngineCLIOpts;
type CommandOpts = CommandCLIOpts & SetupEngineOpts & CommandCommonProps;
type CommandOutput = {
    resp?: any;
} & CommandCommonProps;
export { CommandOpts as DoctorCLICommandOpts };
export declare class DoctorCLICommand extends CLICommand<CommandOpts, CommandOutput> {
    constructor();
    buildArgs(args: yargs.Argv): void;
    enrichArgs(args: CommandCLIOpts): Promise<{
        data: {
            wsRoot: string;
            engine: import("@dendronhq/common-all").DEngineClient;
            port: number;
            server: import("../../../api-server/src").Server;
            serverSockets?: Set<import("net").Socket> | undefined;
            action: DoctorActionsEnum;
            query?: string | undefined;
            /**
             * pass in note candidates directly to
             * limit what notes should be used in the command.
             */
            candidates?: NoteProps[] | undefined;
            limit?: number | undefined;
            dryRun?: boolean | undefined;
            /**
             * When set to true, calls process.exit when command is done.
             *
             * This is done for CLI commands to keep the server from running
             * forever. when run from the plugin, we re-use the existing server
             * so we don't want it to exit.
             */
            exit?: boolean | undefined;
            /**
             * pod Id used to export Note(s) to Airtable
             */
            podId?: string | undefined;
            enginePort?: number | undefined;
            useLocalEngine?: boolean | undefined;
            attach?: boolean | undefined;
            target?: import("@dendronhq/engine-server").EngineConnectorTarget | undefined;
            newEngine?: boolean | undefined;
            init?: boolean | undefined;
            fast?: boolean | undefined;
            noWritePort?: boolean | undefined;
        };
    }>;
    /**
     * Given opts and out,
     * prepare the analytics payload that should be included to the
     * tracked event.
     *
     * Implement {@link DoctorService.executeDoctorActions} so that
     * it outputs the necessary information,
     * and prepare / add it here.
     *
     * Only the cases implemented will add a payload.
     */
    addAnalyticsPayload(opts: CommandOpts, out: CommandOutput): Promise<void>;
    execute(opts: CommandOpts): Promise<CommandOutput>;
}
