import { FuseEngine } from "@dendronhq/common-all";
import { Uri } from "vscode";
/**
 * Instantiate fuseEngine using values from config
 *
 * @param wsRoot
 * @returns fuseEngine
 */
export declare function getFuseEngine(wsRoot: Uri): Promise<FuseEngine>;
