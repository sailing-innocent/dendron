import * as vscode from "vscode";
import { BasicCommand } from "./base";
export type InstrumentedWrapperCommandArgs = {
    /**
     * The underlying command to be wrapped
     */
    command: vscode.Command;
    /**
     * telemetry event name
     */
    event: string;
    /**
     * custom props to attach to the telemetry event
     */
    customProps?: any;
};
/**
 * This command is a simple wrapper around commands, but this wrapper also fires
 * a telemetry event when it is invoked. This is intended to be used as a
 * wrapper around built-in VSCode commands that need to be invoked via a command
 * URI, such as within webviews or in TreeView items, but where we still want a
 * telemetry event to get reported.
 */
export declare class InstrumentedWrapperCommand extends BasicCommand<InstrumentedWrapperCommandArgs, void> {
    key: string;
    /**
     * Helper method to create a vscode.Command instance that utilizes this wrapper
     * @param args
     * @returns
     */
    static createVSCodeCommand(args: InstrumentedWrapperCommandArgs): vscode.Command;
    execute(opts: InstrumentedWrapperCommandArgs): Promise<void>;
}
