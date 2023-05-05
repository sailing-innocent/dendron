import { z } from "zod";
import type { Result } from "neverthrow";
import { DendronError } from "./error";
export { z };
/**
 * util for defining zod schemas with external/custom types.
 * Origin: https://github.com/colinhacks/zod/issues/372#issuecomment-826380330
 * @returns a function to be called with a zod schema
 */
export declare const schemaForType: <T>() => <S extends z.ZodType<T, any, any>>(arg: S) => S;
/**
 * Parse `zod` schema into `Result`
 * @param schema ZodType
 * @param raw unknown
 * @param msg string
 * @returns Result<T>
 */
export declare const parse: <T extends z.ZodTypeAny>(schema: T, raw: unknown, msg?: string) => Result<z.TypeOf<T>, DendronError<import("http-status-codes").StatusCodes | undefined>>;
