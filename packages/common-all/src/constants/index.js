"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GLOBAL_STATE_KEYS = exports.DENDRON_VSCODE_CONFIG_KEYS = exports.DENDRON_EMOJIS = exports.USERS_HIERARCHY = exports.USERS_HIERARCHY_BASE = exports.TAGS_HIERARCHY = exports.TAGS_HIERARCHY_BASE = exports.RESERVED_KEYS = exports.ERROR_SEVERITY = exports.USER_MESSAGES = exports.ERROR_STATUS = exports.FOLDERS = exports.CONSTANTS = exports.ThemeTarget = exports.ThemeType = exports.getStatusCode = exports.getReasonPhrase = exports.StatusCodes = exports.ReasonPhrases = void 0;
__exportStar(require("./frontend"), exports);
__exportStar(require("./views"), exports);
__exportStar(require("./lookup"), exports);
__exportStar(require("./configs/compat"), exports);
var http_status_codes_1 = require("http-status-codes");
Object.defineProperty(exports, "ReasonPhrases", { enumerable: true, get: function () { return http_status_codes_1.ReasonPhrases; } });
Object.defineProperty(exports, "StatusCodes", { enumerable: true, get: function () { return http_status_codes_1.StatusCodes; } });
Object.defineProperty(exports, "getReasonPhrase", { enumerable: true, get: function () { return http_status_codes_1.getReasonPhrase; } });
Object.defineProperty(exports, "getStatusCode", { enumerable: true, get: function () { return http_status_codes_1.getStatusCode; } });
const ROOT_PATH = "/doc/root";
var ThemeType;
(function (ThemeType) {
    ThemeType["LIGHT"] = "light";
    ThemeType["DARK"] = "dark";
})(ThemeType = exports.ThemeType || (exports.ThemeType = {}));
var ThemeTarget;
(function (ThemeTarget) {
    ThemeTarget["PRISM"] = "PRISM";
})(ThemeTarget = exports.ThemeTarget || (exports.ThemeTarget = {}));
exports.CONSTANTS = {
    ROOT_PATH,
    ALL_QUERY: "**/*",
    DENDRON_WS_NAME: "dendron.code-workspace",
    DENDRON_SERVER_PORT: ".dendron.port",
    DENDRON_WS_META: ".dendron.ws",
    DENDRON_CONFIG_FILE: "dendron.yml",
    DENDRON_LOCAL_CONFIG_FILE: "dendronrc.yml",
    DENDRON_SEED_CONFIG: "seed.yml",
    DENDRON_DELIMETER: "dendron://",
    DENDRON_USER_FILE: ".dendron.user",
    DENDRON_CACHE_FILE: ".dendron.cache.json",
    DENDRON_ID: ".dendron.uuid",
    DENDRON_NO_TELEMETRY: ".dendron.no-telemetry",
    DENDRON_TELEMETRY: ".dendron.telemetry",
    DENDRON_HOOKS_BASE: "hooks",
    DENDRON_USER_NOTE_TRAITS_BASE: "noteTraits",
    DENDRON_LOCAL_SITE_PORT: 8080,
    /**
     * Initial version for first installaion
     */
    DENDRON_INIT_VERSION: "0.0.0",
    /** Default for the `maxNoteLength` config. */
    DENDRON_DEFAULT_MAX_NOTE_LENGTH: 204800,
    /** The file containing the custom theme CSS. Located at the workspace root. */
    CUSTOM_THEME_CSS: "custom.css",
};
exports.FOLDERS = {
    /** The folder where the vault dependencies are stored. */
    DEPENDENCIES: "dependencies",
    /** The subfolder of {@link FOLDERS.DEPENDENCIES} where local vaults are stored. */
    LOCAL_DEPENDENCY: "localhost",
    /** The folder where the notes of the vault are stored. */
    NOTES: "notes",
    /** The folder where the assets are stored, this will be under {@link FOLDERS.NOTES}. */
    ASSETS: "assets",
    /** The system-wide folder where Dendron stores metadata and other system-wide files. */
    DENDRON_SYSTEM_ROOT: ".dendron",
    /** The folder where telemetry payloads that will be sent during next run are temporarily saved. Under {@link FOLDERS.DENDRON_SYSTEM_ROOT}. */
    SAVED_TELEMETRY: "saved-telemetry",
};
var ERROR_STATUS;
(function (ERROR_STATUS) {
    ERROR_STATUS["BACKUP_FAILED"] = "backup_failed";
    ERROR_STATUS["NODE_EXISTS"] = "node_exists";
    ERROR_STATUS["NO_SCHEMA_FOUND"] = "no_schema_found";
    ERROR_STATUS["NO_ROOT_SCHEMA_FOUND"] = "no_root_schema_found";
    ERROR_STATUS["MISSING_SCHEMA"] = "missing_schema";
    ERROR_STATUS["NO_ROOT_NOTE_FOUND"] = "no_root_note_found";
    ERROR_STATUS["BAD_PARSE_FOR_SCHEMA"] = "bad_parse_for_schema";
    ERROR_STATUS["NO_PARENT_FOR_NOTE"] = "no_parent_for_note";
    ERROR_STATUS["CANT_DELETE_ROOT"] = "no_delete_root_node";
    // --- 400, client errors
    // Bucket
    ERROR_STATUS["BAD_PARSE_FOR_NOTE"] = "bad_parse_for_note";
    ERROR_STATUS["ENGINE_NOT_SET"] = "no_engine_set";
    // 401
    ERROR_STATUS["NOT_AUTHORIZED"] = "not_authorized";
    // 402
    ERROR_STATUS["DOES_NOT_EXIST"] = "does_not_exist_error";
    ERROR_STATUS["INVALID_CONFIG"] = "invalid_config";
    ERROR_STATUS["INVALID_STATE"] = "invalid_state";
    // --- 500
    ERROR_STATUS["UNKNOWN"] = "unknown";
    // storage layer errors
    ERROR_STATUS["CONTENT_NOT_FOUND"] = "content_not_found";
    ERROR_STATUS["WRITE_FAILED"] = "write_failed";
    ERROR_STATUS["DELETE_FAILED"] = "delete_failed";
    ERROR_STATUS["RENAME_FAILED"] = "rename_failed";
})(ERROR_STATUS = exports.ERROR_STATUS || (exports.ERROR_STATUS = {}));
var USER_MESSAGES;
(function (USER_MESSAGES) {
    USER_MESSAGES["UNKNOWN"] = "unknown";
})(USER_MESSAGES = exports.USER_MESSAGES || (exports.USER_MESSAGES = {}));
/**
 * Labels whether error is recoverable or not
 */
var ERROR_SEVERITY;
(function (ERROR_SEVERITY) {
    ERROR_SEVERITY["MINOR"] = "minor";
    ERROR_SEVERITY["FATAL"] = "fatal";
})(ERROR_SEVERITY = exports.ERROR_SEVERITY || (exports.ERROR_SEVERITY = {}));
var RESERVED_KEYS;
(function (RESERVED_KEYS) {
    RESERVED_KEYS["GIT_NOTE_PATH"] = "gitNotePath";
    RESERVED_KEYS["GIT_NO_LINK"] = "gitNoLink";
})(RESERVED_KEYS = exports.RESERVED_KEYS || (exports.RESERVED_KEYS = {}));
exports.TAGS_HIERARCHY_BASE = "tags";
/** Notes under this hierarchy are considered tags, for example `${TAGS_HIERARCHY}foo` is a tag note. */
exports.TAGS_HIERARCHY = `${exports.TAGS_HIERARCHY_BASE}.`;
exports.USERS_HIERARCHY_BASE = "user";
/** Notes under this hierarchy are considered users, for example `${USERS_HIERARCHY}Hamilton` is a user note. */
exports.USERS_HIERARCHY = `${exports.USERS_HIERARCHY_BASE}.`;
var DENDRON_EMOJIS;
(function (DENDRON_EMOJIS) {
    DENDRON_EMOJIS["SEEDLING"] = "\uD83C\uDF31";
    DENDRON_EMOJIS["OKAY"] = "\u2705";
    DENDRON_EMOJIS["NOT_OKAY"] = "\u274E";
})(DENDRON_EMOJIS = exports.DENDRON_EMOJIS || (exports.DENDRON_EMOJIS = {}));
var DENDRON_VSCODE_CONFIG_KEYS;
(function (DENDRON_VSCODE_CONFIG_KEYS) {
    DENDRON_VSCODE_CONFIG_KEYS["ENABLE_SELF_CONTAINED_VAULTS_WORKSPACE"] = "dendron.enableSelfContainedVaultWorkspace";
})(DENDRON_VSCODE_CONFIG_KEYS = exports.DENDRON_VSCODE_CONFIG_KEYS || (exports.DENDRON_VSCODE_CONFIG_KEYS = {}));
/**
 * Keys to a global state store. Global here means across a single user's
 * different access platforms.
 */
var GLOBAL_STATE_KEYS;
(function (GLOBAL_STATE_KEYS) {
    GLOBAL_STATE_KEYS["ANONYMOUS_ID"] = "telemetry.anonymousId";
})(GLOBAL_STATE_KEYS = exports.GLOBAL_STATE_KEYS || (exports.GLOBAL_STATE_KEYS = {}));
//# sourceMappingURL=index.js.map