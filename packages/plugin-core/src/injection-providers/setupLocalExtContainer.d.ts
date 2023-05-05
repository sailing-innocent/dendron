import "reflect-metadata";
import { DendronConfig, DVault } from "@dendronhq/common-all";
import * as vscode from "vscode";
import { EngineAPIService } from "../services/EngineAPIService";
export declare function setupLocalExtContainer(opts: {
    wsRoot: string;
    vaults: DVault[];
    engine: EngineAPIService;
    config: DendronConfig;
    context: vscode.ExtensionContext;
}): Promise<void>;
