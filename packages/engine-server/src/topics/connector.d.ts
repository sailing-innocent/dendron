/// <reference types="node" />
import { DendronConfig, DEngineClient, DVault } from "@dendronhq/common-all";
import { DLogger } from "@dendronhq/common-server";
import { FSWatcher } from "fs-extra";
import { DendronEngineClient } from "../engineClient";
export type EngineConnectorTarget = "cli" | "workspace";
export type EngineConnectorCommonOpts = {
    /**
     * Should initialize engine before sync?
     */
    init?: boolean;
    /**
     * Are we connecting to an engine initialized by a workspace or the CLI?
     */
    target?: EngineConnectorTarget;
};
export type EngineConnectorInitOpts = {
    onReady?: (opts: {
        ws: EngineConnector;
    }) => Promise<void>;
    numRetries?: number;
    portOverride?: number;
    fast?: boolean;
} & EngineConnectorCommonOpts;
export declare class EngineConnector {
    /**
     * Conencts to the {@link DendronEngine}
     *
     * @remarks
     * Before initiating a connection, {@link EngineConnector.init} needs to be called
     */
    wsRoot: string;
    _engine: DEngineClient | undefined;
    port: number | undefined;
    onReady?: ({ ws }: {
        ws: EngineConnector;
    }) => Promise<void>;
    serverPortWatcher?: FSWatcher;
    initialized: boolean;
    config: DendronConfig;
    logger: DLogger;
    static _ENGINE_CONNECTOR: EngineConnector | undefined;
    static instance(): EngineConnector;
    static getOrCreate({ wsRoot, logger, force, }: {
        wsRoot: string;
        logger?: DLogger;
        force?: boolean;
    }): EngineConnector;
    constructor({ wsRoot, logger }: {
        wsRoot: string;
        logger?: DLogger;
    });
    get vaults(): DVault[];
    /**
     * Connect with engine
     * @param opts
     * @returns
     */
    init(opts?: EngineConnectorInitOpts): Promise<void>;
    initEngine(opts: {
        engine: DendronEngineClient;
        port: number;
        init?: boolean;
    }): Promise<DendronEngineClient>;
    tryToConnect({ port }: {
        port: number;
    }): Promise<false | DendronEngineClient>;
    get engine(): DEngineClient;
    private _connect;
    connectAndInit(opts: {
        wsRoot: string;
        init?: boolean;
    }): Promise<unknown>;
    createServerWatcher(opts?: {
        numRetries?: number;
    } & EngineConnectorCommonOpts): Promise<void>;
    onChangePort({ port }: {
        port: number;
    }): Promise<void>;
}
