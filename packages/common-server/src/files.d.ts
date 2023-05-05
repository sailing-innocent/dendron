/// <reference types="node" />
import { Dirent } from "fs-extra";
import { DendronError, GetAllFilesOpts, RespV2, AnyJson, Result } from "@dendronhq/common-all";
/**
 *
 * Normalize file name
 * - strip off extension
 * - replace [.\s] with -
 * @param name
 * @param opts
 *   - isDir: dealing with directory
 */
export declare function cleanFileName(name: string, opts?: {
    isDir?: boolean;
}): string;
export declare function findInParent(base: string, fname: string): string | undefined;
export declare function readMD(fpath: string): {
    data: any;
    content: string;
};
/**
 *
 * @param fpath path of yaml file to read
 * @param overwriteDuplcate if set to true, will not throw duplicate entry exception and use the last entry.
 * @returns
 */
export declare function readYAML(fpath: string, overwriteDuplicate?: boolean): any;
export declare function readYAMLAsync(fpath: string): Promise<any>;
export declare function writeYAML(fpath: string, data: any): void;
export declare function writeYAMLAsync(fpath: string, data: any): Promise<void>;
export declare function deleteFile(fpath: string): void;
/** Gets all files in `root`, with include and exclude lists (glob matched)
 *
 * This function returns the full `Dirent` which gives you access to file
 * metadata. If you don't need the metadata, see {@link getAllFiles}.
 *
 * @throws a `DendronError` with `ERROR_SEVERITY.MINOR`. This is to avoid
 * crashing the Dendron initialization, please catch the error and modify the
 * severity if needed.
 */
export declare function getAllFilesWithTypes(opts: GetAllFilesOpts): Promise<RespV2<Dirent[]>>;
/** Gets all files in `root`, with include and exclude lists (glob matched)
 *
 * This function returns only the file name. If you need the file metadata, see
 * {@link getAllFilesWithTypes}.
 *
 * @throws a `DendronError` with `ERROR_SEVERITY.MINOR`. This is to avoid
 * crashing the Dendron initialization, please catch the error and modify the
 * severity if needed.
 */
export declare function getAllFiles(opts: GetAllFilesOpts): Promise<RespV2<string[]>>;
/**
 * Convert a node to a MD File. Any custom attributes will be
 * added to the end
 *
 * @param node: node to convert
 * @param opts
 *   - root: root folder where files should be written to
 */
export declare function resolveTilde(filePath: string): string;
/**
 * Resolve file path and resolve relative paths relative to `root`
 * @param filePath
 * @param root
 */
export declare function resolvePath(filePath: string, root?: string): string;
export declare function removeMDExtension(nodePath: string): string;
export declare function readString(path: string): Result<string, DendronError<import("@dendronhq/common-all").StatusCodes | undefined>>;
export declare function readJson(path: string): import("neverthrow").ResultAsync<AnyJson, DendronError<import("@dendronhq/common-all").StatusCodes | undefined>>;
