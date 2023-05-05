import { DEngine } from "@dendronhq/common-all";
import { ExecaChildProcess } from "execa";
export declare function getWSKey(uri: string): string;
export declare function putWS({ ws, engine }: {
    ws: string;
    engine: DEngine;
}): Promise<void>;
export declare function getWSEngine({ ws }: {
    ws: string;
}): Promise<DEngine>;
type ServerArgs = {
    scriptPath: string;
    logPath: string;
    port?: number;
    nextServerUrl?: string;
    nextStaticRoot?: string;
    googleOauthClientId?: string;
    googleOauthClientSecret?: string;
};
export declare enum SubProcessExitType {
    EXIT = "exit",
    SIGINT = "SIGINT",
    SIGURS1 = "SIGUSR1",
    SIGURS2 = "SIGUSR2",
    UNCAUGHT_EXCEPTION = "uncaughtException"
}
export declare class ServerUtils {
    static onProcessExit({ subprocess, cb, }: {
        subprocess: ExecaChildProcess;
        cb: (exitType: SubProcessExitType, args?: any) => any;
    }): void;
    /**
     * Attach to a server process to kill it when the current process exits
     * @param subprocess
     */
    static cleanServerProcess(subprocess: ExecaChildProcess): void;
    static prepareServerArgs(): {
        port: number | undefined;
        logPath: string;
        nextServerUrl: string | undefined;
        nextStaticRoot: string | undefined;
        googleOauthClientId: string;
        googleOauthClientSecret: string;
    };
    /**
     * Launch engine server
     * @param
     * @returns
     */
    static startServerNode({ logPath, nextServerUrl, nextStaticRoot, port, googleOauthClientId, googleOauthClientSecret, }: Omit<ServerArgs, "scriptPath">): Promise<{
        port: number;
    }>;
    /**
     * Create a subprocess with a running instance of the engine server
     * @returns
     */
    static execServerNode({ scriptPath, logPath, nextServerUrl, nextStaticRoot, port, googleOauthClientId, googleOauthClientSecret, }: ServerArgs): Promise<{
        port: number;
        subprocess: ExecaChildProcess;
    }>;
}
export declare enum ProcessReturnType {
    ERROR = "error"
}
export {};
