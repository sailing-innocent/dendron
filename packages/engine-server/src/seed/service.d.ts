import { DendronError, SeedConfig, SeedVault } from "@dendronhq/common-all";
import { SeedRegistry } from "./registry";
export declare enum SeedInitMode {
    CREATE_WORKSPACE = "create_workspace",
    CONVERT_WORKSPACE = "convert_workspace"
}
export type SeedSvcResp = {
    data?: {
        seed: SeedConfig;
        seedPath?: string;
    };
    error?: DendronError;
};
export declare class SeedService {
    wsRoot: string;
    registryFile?: string;
    protected registry: SeedRegistry;
    /**
     *
     * @param wsRoot - root of file
     * @param registryFile - custom yml file to look for registry
     */
    constructor({ wsRoot, registryFile, registry, }: {
        wsRoot: string;
        registryFile?: string;
        registry?: SeedRegistry;
    });
    protected getSeedOrErrorFromId(id: string): Promise<SeedConfig | DendronError>;
    addSeed({ id, metaOnly, onUpdatingWorkspace, onUpdatedWorkspace, }: {
        id: string;
        metaOnly?: boolean;
        onUpdatingWorkspace?: () => Promise<void>;
        onUpdatedWorkspace?: () => Promise<void>;
    }): Promise<SeedSvcResp>;
    /**
     * Add seed metadata.
     * @returns
     */
    addSeedMetadata({ seed, wsRoot, onUpdatingWorkspace, onUpdatedWorkspace, }: {
        seed: SeedConfig;
        wsRoot: string;
        onUpdatingWorkspace?: () => Promise<void>;
        onUpdatedWorkspace?: () => Promise<void>;
    }): Promise<{
        seed: SeedConfig;
    }>;
    /**
     *
     * @param branch - optional branch to clone from
     * @returns
     */
    cloneSeed({ seed, branch }: {
        seed: SeedConfig;
        branch?: string;
    }): Promise<string>;
    init(opts: {
        seed: SeedConfig;
        wsRoot: string;
        mode: SeedInitMode;
    }): Promise<{
        error: DendronError<import("@dendronhq/common-all").StatusCodes | undefined>;
        data?: undefined;
    } | {
        data: {
            seed: SeedConfig;
        };
        error?: undefined;
    }>;
    info({ id }: {
        id: string;
    }): Promise<SeedConfig | undefined>;
    removeSeed({ id, onUpdatingWorkspace, onUpdatedWorkspace, }: {
        id: string;
        onUpdatingWorkspace?: () => Promise<void>;
        onUpdatedWorkspace?: () => Promise<void>;
    }): Promise<SeedSvcResp>;
    removeSeedMetadata({ seed, onUpdatingWorkspace, onUpdatedWorkspace, }: {
        seed: SeedConfig;
        onUpdatingWorkspace?: () => Promise<void>;
        onUpdatedWorkspace?: () => Promise<void>;
    }): Promise<void>;
    isSeedInWorkspace(id: string): boolean;
    getSeedVaultsInWorkspace(): SeedVault[];
    getSeedsInWorkspace(): string[];
}
