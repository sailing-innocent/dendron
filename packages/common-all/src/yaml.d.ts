import { Result } from "neverthrow";
import type { AnyJson } from "./types";
import { DendronError } from "./error";
type YAMLDendronError = DendronError;
type YAMLResult<T> = Result<T, YAMLDendronError>;
export declare const fromStr: (str: string, overwriteDuplicate?: boolean) => YAMLResult<AnyJson>;
export declare const toStr: (data: any) => YAMLResult<string>;
export {};
