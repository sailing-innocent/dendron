import { DendronError, RespV3 } from "@dendronhq/common-all";
import { createLogger } from "@dendronhq/common-server";
import yargs from "yargs";
type BaseCommandOpts = {
    quiet?: boolean;
    dev?: boolean;
};
export type CommandCommonProps = {
    error?: DendronError;
    exit?: boolean;
};
export declare abstract class BaseCommand<
/**
 * These are options that are passed to `command.execute`
 */
TOpts extends CommandCommonProps = CommandCommonProps, 
/**
 * This is the output returned by `command.execute`
 */
TOut extends CommandCommonProps = CommandCommonProps> {
    L: ReturnType<typeof createLogger>;
    opts: BaseCommandOpts;
    constructor(name?: string, opts?: BaseCommandOpts);
    abstract execute(opts?: TOpts): Promise<TOut>;
}
export declare abstract class CLICommand<TOpts extends CommandCommonProps = CommandCommonProps, TOut extends CommandCommonProps = CommandCommonProps> extends BaseCommand<TOpts, TOut> {
    name: string;
    desc: string;
    protected wsRootOptional?: boolean;
    protected skipValidation?: boolean;
    protected _analyticsPayload: any;
    constructor(opts: {
        name: string;
        desc: string;
    } & BaseCommandOpts);
    buildArgs(args: yargs.Argv): void;
    buildCmd(yargs: yargs.Argv): yargs.Argv;
    setUpSegmentClient(): void;
    addAnalyticsPayload?(opts?: TOpts, out?: TOut): any;
    validateConfig(opts: {
        wsRoot: string;
    }): Promise<void>;
    addArgsToPayload(data: any): void;
    addToPayload(opts: {
        key: string;
        value: any;
    }): void;
    /**
     * Converts CLI flags into {@link TOpts}
     * @param args
     */
    abstract enrichArgs(args: any): Promise<RespV3<TOpts>>;
    eval: (args: any) => Promise<TOut | {
        error: import("@dendronhq/common-all").IDendronError;
    }>;
    print(obj: any): void;
    printError(obj: any): void;
}
export {};
