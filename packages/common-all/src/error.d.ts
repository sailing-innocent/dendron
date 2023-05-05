import { StatusCodes } from "http-status-codes";
import { AxiosError } from "axios";
import { ERROR_SEVERITY, ERROR_STATUS } from "./constants";
import { RespV3, RespV3ErrorResp } from "./types";
export type DendronErrorProps<TCode = StatusCodes | undefined> = {
    /**
     * Arbitrary payload
     */
    payload?: any;
    /**
     * See {@link ERROR_SEVERITY}
     */
    severity?: ERROR_SEVERITY;
    /**
     * Optional HTTP status code for error
     */
    code?: TCode;
    /**
     * @deprecated - should only used in DendronServerError
     * Custom status errors
     */
    status?: string;
    /**
     * Inner Error object
     */
    innerError?: Error;
} & Error;
type ServerErrorProps = {
    /**
     * Custom status errors
     */
    status?: string;
    /**
     * Optional HTTP status code for error
     */
    code?: StatusCodes;
};
export type IDendronError<TCode = StatusCodes | undefined> = DendronErrorProps<TCode>;
export declare class DendronError<TCode = StatusCodes | undefined> extends Error implements IDendronError<TCode> {
    status?: string;
    payload?: string;
    severity?: ERROR_SEVERITY;
    code?: TCode;
    innerError?: Error;
    /** The output that may be displayed to a person if they encounter this error. */
    stringifyForHumanReading(): string;
    /** Overload this to change how the `payload` is stringified. */
    protected payloadStringify(): string;
    /** The output that may be saved into the local logs for the user. */
    stringifyForLogs(): string;
    /** The output that may be sent to Sentry, or other telemetry service.
     *
     * This function will eventually check that the output is stripped of PII,
     * but for now that's the same as these.
     */
    stringifyForTelemetry(): string;
    /** If false, this error does not necessarily mean the operation failed. It should be possible to recover and resume. */
    get isFatal(): boolean;
    static isDendronError(error: any): error is IDendronError;
    static createPlainError(props: Omit<DendronErrorProps, "name">): DendronErrorProps<StatusCodes | undefined>;
    static createFromStatus({ status, ...rest }: {
        status: ERROR_STATUS;
    } & Partial<DendronErrorProps>): DendronError;
    constructor({ message, status, payload, severity, code, innerError, }: Omit<DendronErrorProps<TCode>, "name">);
}
export declare class DendronCompositeError extends Error implements IDendronError {
    payload: DendronErrorProps[];
    severity?: ERROR_SEVERITY;
    errors: IDendronError[];
    constructor(errors: IDendronError[]);
    static isDendronCompositeError(error: IDendronError): error is DendronCompositeError;
}
/** If the error is a composite error, then returns the list of errors inside it.
 *
 * If it is a single error, then returns that single error in a list.
 *
 * If this was not a Dendron error, then returns an empty list.
 */
export declare function errorsList(error: any): DendronErrorProps<StatusCodes | undefined>[];
export declare class DendronServerError extends DendronError implements IDendronError, ServerErrorProps {
    /**
     * Optional HTTP status code for error
     */
    code?: StatusCodes;
    /**
     * Custom status errors
     */
    status?: string;
}
export declare class IllegalOperationError extends DendronError {
}
export declare function stringifyError(err: Error): string;
export declare const error2PlainObject: (err: IDendronError) => DendronErrorProps;
export declare class ErrorMessages {
    static formatShouldNeverOccurMsg(description?: string): string;
}
/** Statically ensure that a code path is unreachable using a variable that has been exhaustively used.
 *
 * The use case for this function is that when using a switch or a chain of if/else if statements,
 * this function allows you to ensure that after all possibilities have been already checked, no further
 * possibilities remain. Importantly, this is done statically (i.e. during compilation), so if anyone
 * revises the code in a way that adds expands the possibilities, a compiler error will warn them that
 * they must revise this part of the code as well.
 *
 * An example of how this function may be used is below:
 *
 * ```ts
 * type Names = "bar" | "baz";
 *
 * function foo(name: Names) {
 *   if (name === "bar") { ... }
 *   else if (name === "baz") { ... }
 *   else assertUnreachable(name);
 * }
 * ```
 *
 * Let's say someone changes the type Names to `type Names = "bar" | "baz" | "ham";`. Thanks to this
 * assertion, the compiler will warn them that this branch is now reachable, and something is wrong.
 *
 * Here's another example:
 *
 * ```
 * switch (msg.type) {
 *   case GraphViewMessageType.onSelect:
 *   // ...
 *   // ... all the cases
 *   default:
 *     assertUnreachable(msg.type);
 * }
 * ```
 *
 * Warning! Never use this function without a parameter. It won't actually do any type checks then.
 */
export declare function assertUnreachable(_never: never): never;
/**
 * Helper function to raise invalid state
 */
export declare function assertInvalidState(msg: string): never;
/** Utility class for helping to correctly construct common errors. */
export declare class ErrorFactory {
    /**
     * Not found
     */
    static create404Error({ url }: {
        url: string;
    }): DendronError;
    static createUnexpectedEventError({ event }: {
        event: any;
    }): DendronError;
    static createInvalidStateError({ message, }: {
        message: string;
    }): DendronError;
    static createSchemaValidationError({ message, }: {
        message: string;
    }): DendronError;
    /** Stringify that will not throw if it fails to stringify
     * (for example: due to circular references)  */
    static safeStringify(obj: any): string;
    /** Wraps the error in DendronError WHEN the instance is not already a DendronError. */
    static wrapIfNeeded(err: any): DendronError;
}
export declare class ErrorUtils {
    static isAxiosError(error: unknown): error is AxiosError;
    static isDendronError(error: any): error is DendronError;
    /**
     * Given a RespV3, ensure it is an error resp.
     *
     * This helps typescript properly narrow down the type of the success resp's data as type T where it is called.
     * Otherwise, because of how union types work, `data` will have the type T | undefined.
     * @param args
     * @returns
     */
    static isErrorResp(resp: RespV3<any>): resp is RespV3ErrorResp;
}
export declare function isTSError(err: any): err is Error;
export {};
