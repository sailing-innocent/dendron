"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTSError = exports.ErrorUtils = exports.ErrorFactory = exports.assertInvalidState = exports.assertUnreachable = exports.ErrorMessages = exports.error2PlainObject = exports.stringifyError = exports.IllegalOperationError = exports.DendronServerError = exports.errorsList = exports.DendronCompositeError = exports.DendronError = void 0;
const lodash_1 = __importDefault(require("lodash"));
const constants_1 = require("./constants");
class DendronError extends Error {
    /** The output that may be displayed to a person if they encounter this error. */
    stringifyForHumanReading() {
        return this.message;
    }
    /** Overload this to change how the `payload` is stringified. */
    payloadStringify() {
        return JSON.stringify(this.payload);
    }
    /** The output that may be saved into the local logs for the user. */
    stringifyForLogs() {
        const { severity, code, message } = this;
        const payload = {
            severity,
            code,
            message,
        };
        if (this.innerError) {
            payload.innerError = this.innerError;
        }
        if (this.payload) {
            payload.payload = this.payloadStringify();
        }
        return JSON.stringify(payload);
    }
    /** The output that may be sent to Sentry, or other telemetry service.
     *
     * This function will eventually check that the output is stripped of PII,
     * but for now that's the same as these.
     */
    stringifyForTelemetry() {
        return this.stringifyForLogs();
    }
    /** If false, this error does not necessarily mean the operation failed. It should be possible to recover and resume. */
    get isFatal() {
        return this.severity === constants_1.ERROR_SEVERITY.FATAL;
    }
    static isDendronError(error) {
        return (error === null || error === void 0 ? void 0 : error.message) !== undefined;
    }
    static createPlainError(props) {
        return (0, exports.error2PlainObject)({
            ...props,
            // isComposite: false,
            name: "DendronError",
        });
    }
    static createFromStatus({ status, ...rest }) {
        return new DendronError({
            name: "DendronError",
            message: status,
            status,
            ...rest,
        });
    }
    constructor({ message, status, payload, severity, code, innerError, }) {
        super(message);
        this.name = "DendronError";
        this.status = status || "unknown";
        this.severity = severity;
        this.message = message || "";
        if ((payload === null || payload === void 0 ? void 0 : payload.message) && (payload === null || payload === void 0 ? void 0 : payload.stack)) {
            this.payload = JSON.stringify({
                msg: payload.message,
                stack: payload.stack,
            });
        }
        else if (lodash_1.default.isString(payload)) {
            this.payload = payload;
        }
        else {
            this.payload = JSON.stringify(payload || {});
        }
        this.code = code;
        this.innerError = innerError;
        if (innerError) {
            this.stack = innerError.stack;
        }
    }
}
exports.DendronError = DendronError;
class DendronCompositeError extends Error {
    constructor(errors) {
        super();
        this.payload = errors.map((err) => (0, exports.error2PlainObject)(err));
        this.errors = errors;
        const hasFatalError = lodash_1.default.find(errors, (err) => err.severity === constants_1.ERROR_SEVERITY.FATAL) !==
            undefined;
        const allMinorErrors = lodash_1.default.filter(errors, (err) => err.severity !== constants_1.ERROR_SEVERITY.MINOR)
            .length === 0;
        if (hasFatalError) {
            // If there is even one fatal error, then the composite is also fatal
            this.severity = constants_1.ERROR_SEVERITY.FATAL;
        }
        else if (allMinorErrors) {
            // No fatal errors, and everything is a minor error.
            // The composite can be safely marked as a minor error too.
            this.severity = constants_1.ERROR_SEVERITY.MINOR;
        }
        // sometimes a composite error can be of size one. unwrap and show regular error message in this case
        if (this.errors.length === 1) {
            this.message = this.errors[0].message;
        }
        else if (this.errors.length > 1) {
            const out = ["Multiple errors: "];
            const messages = this.errors.map((err) => ` - ${err.message}`);
            this.message = out.concat(messages).join("\n");
        }
    }
    static isDendronCompositeError(error) {
        if (error.payload && lodash_1.default.isString(error.payload)) {
            try {
                // Sometimes these sections get serialized when going across from engine to UI
                error.payload = JSON.parse(error.payload);
            }
            catch {
                // Nothing, the payload wasn't a serialized object
            }
        }
        return (lodash_1.default.isArray(error.payload) &&
            error.payload.every(DendronError.isDendronError));
    }
}
exports.DendronCompositeError = DendronCompositeError;
/** If the error is a composite error, then returns the list of errors inside it.
 *
 * If it is a single error, then returns that single error in a list.
 *
 * If this was not a Dendron error, then returns an empty list.
 */
function errorsList(error) {
    if (DendronCompositeError.isDendronCompositeError(error))
        return error.payload;
    if (DendronError.isDendronError(error))
        return [error];
    return [];
}
exports.errorsList = errorsList;
class DendronServerError extends DendronError {
}
exports.DendronServerError = DendronServerError;
class IllegalOperationError extends DendronError {
}
exports.IllegalOperationError = IllegalOperationError;
function stringifyError(err) {
    return JSON.stringify(err, Object.getOwnPropertyNames(err));
}
exports.stringifyError = stringifyError;
const error2PlainObject = (err) => {
    const out = {};
    Object.getOwnPropertyNames(err).forEach((k) => {
        // @ts-ignore
        out[k] = err[k];
    });
    return out;
};
exports.error2PlainObject = error2PlainObject;
class ErrorMessages {
    static formatShouldNeverOccurMsg(description) {
        return `${description === undefined ? "" : description + " "}This error should never occur! Please report a bug if you have encountered this.`;
    }
}
exports.ErrorMessages = ErrorMessages;
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
function assertUnreachable(_never) {
    throw new DendronError({
        message: ErrorMessages.formatShouldNeverOccurMsg(),
    });
}
exports.assertUnreachable = assertUnreachable;
/**
 * Helper function to raise invalid state
 */
function assertInvalidState(msg) {
    throw new DendronError({
        status: constants_1.ERROR_STATUS.INVALID_STATE,
        message: msg,
    });
}
exports.assertInvalidState = assertInvalidState;
/** Utility class for helping to correctly construct common errors. */
class ErrorFactory {
    /**
     * Not found
     */
    static create404Error({ url }) {
        return new DendronError({
            message: `resource ${url} does not exist`,
            severity: constants_1.ERROR_SEVERITY.FATAL,
        });
    }
    static createUnexpectedEventError({ event }) {
        return new DendronError({
            message: `unexpected event: '${this.safeStringify(event)}'`,
        });
    }
    static createInvalidStateError({ message, }) {
        return new DendronError({
            status: constants_1.ERROR_STATUS.INVALID_STATE,
            message,
        });
    }
    static createSchemaValidationError({ message, }) {
        return new DendronError({
            message,
            // Setting severity as minor since Dendron could still be functional even
            // if some particular schema is malformed.
            severity: constants_1.ERROR_SEVERITY.MINOR,
        });
    }
    /** Stringify that will not throw if it fails to stringify
     * (for example: due to circular references)  */
    static safeStringify(obj) {
        try {
            return JSON.stringify(obj);
        }
        catch (exc) {
            return `Failed to stringify the given object. Due to '${exc.message}'`;
        }
    }
    /** Wraps the error in DendronError WHEN the instance is not already a DendronError. */
    static wrapIfNeeded(err) {
        if (err instanceof DendronError) {
            // If its already a dendron error we don't need to wrap it.
            return err;
        }
        else if (err instanceof Error) {
            // If its an instance of some other error we will wrap it and keep track
            // of the inner error which was the cause.
            return new DendronError({
                message: err.message,
                innerError: err,
            });
        }
        else {
            // Hopefully we aren't reaching this branch but in case someone throws
            // some object that does not inherit from Error we will attempt to
            // safe stringify it into message and wrap as DendronError.
            return new DendronError({
                message: this.safeStringify(err),
            });
        }
    }
}
exports.ErrorFactory = ErrorFactory;
class ErrorUtils {
    static isAxiosError(error) {
        return lodash_1.default.has(error, "isAxiosError");
    }
    static isDendronError(error) {
        return lodash_1.default.get(error, "name", "") === "DendronError";
    }
    /**
     * Given a RespV3, ensure it is an error resp.
     *
     * This helps typescript properly narrow down the type of the success resp's data as type T where it is called.
     * Otherwise, because of how union types work, `data` will have the type T | undefined.
     * @param args
     * @returns
     */
    static isErrorResp(resp) {
        return "error" in resp;
    }
}
exports.ErrorUtils = ErrorUtils;
function isTSError(err) {
    return (err.message !== undefined && err.name !== undefined);
}
exports.isTSError = isTSError;
//# sourceMappingURL=error.js.map