import { Conflict, PodConflictResolveOpts, RespV3 } from "@dendronhq/common-all";
import { PodClassEntryV4, PodKind } from "@dendronhq/pods-core";
import yargs from "yargs";
import { SetupEngineCLIOpts, SetupEngineResp } from "./utils";
export type PodCLIOpts = {
    podId: string;
    showConfig?: boolean;
    genConfig?: boolean;
    podSource: PodSource;
    podPkg?: string;
    config?: string;
    configPath?: string;
    query?: string;
    vault?: string;
};
export type PodCommandCLIOpts = {} & SetupEngineCLIOpts & PodCLIOpts;
export type PodCommandOpts<T = any> = PodCLIOpts & {
    podClass: any;
    config: T;
} & SetupEngineResp & SetupEngineCLIOpts;
export declare function fetchPodClassV4(podId: string, opts: {
    podSource: PodSource;
    pods?: PodClassEntryV4[];
    podPkg?: string;
    wsRoot?: string;
    podType: PodKind;
}): PodClassEntryV4;
export declare function setupPodArgs(args: yargs.Argv): void;
export declare function enrichPodArgs(opts: {
    pods: PodClassEntryV4[];
    podType: PodKind;
}): (args: PodCommandCLIOpts) => Promise<RespV3<PodCommandOpts>>;
export declare const executePod: (opts: PodCommandOpts) => Promise<void>;
export declare enum PodSource {
    CUSTOM = "custom",
    BUILTIN = "builtin"
}
export declare const handleConflict: (conflict: Conflict, conflictResolveOpts: PodConflictResolveOpts) => Promise<string>;
