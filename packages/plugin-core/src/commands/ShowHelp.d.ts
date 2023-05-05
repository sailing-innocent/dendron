import { BasicCommand } from "./base";
type CommandOpts = {};
type CommandInput = {};
type CommandOutput = void;
export declare class ShowHelpCommand extends BasicCommand<CommandOpts, CommandOutput> {
    key: string;
    gatherInputs(): Promise<CommandInput | undefined>;
    execute(): Promise<void>;
}
export {};
