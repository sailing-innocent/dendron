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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DendronApiV2 = exports.DendronAPI = exports.APIUtils = exports.createNoOpLogger = void 0;
const axios_1 = __importDefault(require("axios"));
const lodash_1 = __importDefault(require("lodash"));
const querystring = __importStar(require("qs"));
const error_1 = require("./error");
function createNoOpLogger() {
    const logMethod = (_msg) => { };
    return {
        level: "",
        debug: logMethod,
        info: logMethod,
        error: logMethod,
    };
}
exports.createNoOpLogger = createNoOpLogger;
class APIUtils {
    /** Generate a localhost url to this API.
     *
     * Warning! In VSCode, the generated URL won't work if the user has a remote
     * workspace. You'll need to use `vscode.env.asExternalUri` to make it remote.
     */
    static getLocalEndpoint(port) {
        return `http://localhost:${port}`;
    }
}
exports.APIUtils = APIUtils;
// === Base
class API {
    constructor(opts) {
        opts = lodash_1.default.defaults(opts, {
            logger: createNoOpLogger(),
            statusHandlers: {},
            onAuth: async ({ headers }) => headers,
            onBuildHeaders: ({ headers }) => headers,
            onError: (_args) => {
                // console.log(args);
            },
        });
        if (!opts._request) {
            opts._request = axios_1.default.create({});
        }
        this.opts = opts;
    }
    _log(msg, lvl = "info") {
        this.opts.logger[lvl](msg);
    }
    _createPayload(data) {
        return {
            data,
        };
    }
    async _doRequest({ auth = false, qs = {}, path, body = {}, method = "get", json = true, }) {
        let headers = {};
        const { _request, onAuth, onBuildHeaders, endpoint, apiPath } = this.opts;
        if (auth) {
            headers = await onAuth({ headers });
        }
        headers = await onBuildHeaders({ headers });
        const requestParams = {
            url: [endpoint, apiPath, path].join("/"),
            qs,
            body,
            json,
            ...headers,
        };
        this._log({ ctx: "pre-request", requestParams }, "debug");
        const str = querystring.stringify(requestParams.qs);
        if (method === "get") {
            return _request.get(requestParams.url + `?${str}`, {
                headers,
            });
        }
        else {
            return _request.post(requestParams.url + `?${str}`, body, {
                headers,
            });
        }
    }
    async _makeRequest(args, payloadData) {
        var _a, _b, _c;
        const payload = this._createPayload(payloadData);
        try {
            const resp = await this._doRequest(args);
            payload.data = resp.data.data;
            payload.error = resp.data.error;
        }
        catch (err) {
            this._log(payload.error, "error");
            // Log errors from express:
            payload.error =
                ((_b = (_a = err === null || err === void 0 ? void 0 : err.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) || // Corresponds to an expected error that we intentionally log in our code
                    ((_c = err === null || err === void 0 ? void 0 : err.response) === null || _c === void 0 ? void 0 : _c.data) || // Corresponds to an unexpected server error (HTTP 500) if a data payload was added
                    err; // Corresponds to an axios (HTTP request) thrown error
        }
        if (payload.error) {
            this._log(payload.error, "error");
        }
        return payload;
    }
    async _makeRequestRaw(args) {
        try {
            const resp = await this._doRequest(args);
            if (resp.data.error) {
                return new error_1.DendronError({ ...resp.data.error });
            }
            return resp.data;
        }
        catch (err) {
            return new error_1.DendronError({ ...err.response.data.error });
        }
    }
}
// === DendronAPI
// eslint-disable-next-line camelcase
let _DendronAPI_INSTANCE;
class DendronAPI extends API {
    static getOrCreate(opts) {
        if (!lodash_1.default.isUndefined(_DendronAPI_INSTANCE)) {
            return this.instance();
        }
        return new DendronAPI(opts);
    }
    static instance() {
        if (lodash_1.default.isUndefined(_DendronAPI_INSTANCE)) {
            throw Error("no dendron api");
        }
        // eslint-disable-next-line camelcase
        return _DendronAPI_INSTANCE;
    }
    assetGet(req) {
        return this._makeRequestRaw({
            path: "assets/",
            method: "get",
            qs: req,
        });
    }
    assetGetTheme(req) {
        return this._makeRequestRaw({
            path: "assets/theme",
            method: "get",
            qs: req,
        });
    }
    configGet(req) {
        return this._makeRequest({
            path: "config/get",
            method: "get",
            qs: req,
        });
    }
    workspaceInit(req) {
        return this._makeRequest({
            path: "workspace/initialize",
            method: "post",
            body: {
                ...req,
            },
        });
    }
    workspaceSync(req) {
        return this._makeRequest({
            path: "workspace/sync",
            method: "post",
            body: req,
        });
    }
    engineBulkAdd(req) {
        return this._makeRequest({
            path: "note/bulkAdd",
            method: "post",
            body: req,
        });
    }
    engineDelete(req) {
        return this._makeRequest({
            path: "note/delete",
            method: "post",
            body: req,
        });
    }
    engineInfo() {
        return this._makeRequest({
            path: "note/info",
            method: "get",
        });
    }
    engineRenameNote(req) {
        return this._makeRequest({
            path: "note/rename",
            method: "post",
            body: req,
        });
    }
    engineWrite(req) {
        return this._makeRequest({
            path: "note/write",
            method: "post",
            body: req,
        });
    }
    noteGet(req) {
        return this._makeRequest({
            path: "note/get",
            method: "get",
            qs: req,
        });
    }
    noteGetMeta(req) {
        return this._makeRequest({
            path: "note/getMeta",
            method: "get",
            qs: req,
        });
    }
    noteBulkGet(req) {
        return this._makeRequest({
            path: "note/bulkGet",
            method: "get",
            qs: req,
        });
    }
    noteBulkGetMeta(req) {
        return this._makeRequest({
            path: "note/bulkGetMeta",
            method: "get",
            qs: req,
        });
    }
    noteFind(req) {
        return this._makeRequest({
            path: "note/find",
            method: "post",
            body: req,
        });
    }
    noteFindMeta(req) {
        return this._makeRequest({
            path: "note/findMeta",
            method: "post",
            body: req,
        });
    }
    noteQuery(req) {
        return this._makeRequest({
            path: "note/query",
            method: "get",
            qs: req,
        });
    }
    noteRender(req) {
        return this._makeRequest({
            path: "note/render",
            method: "post",
            body: req,
        });
    }
    getNoteBlocks(req) {
        return this._makeRequest({
            path: "note/blocks",
            method: "get",
            qs: req,
        });
    }
    getDecorations(req) {
        return this._makeRequest({
            path: "note/decorations",
            method: "post",
            body: req,
        });
    }
    schemaDelete(req) {
        return this._makeRequest({
            path: "schema/delete",
            method: "post",
            body: req,
        });
    }
    schemaRead(req) {
        return this._makeRequest({
            path: "schema/get",
            method: "get",
            qs: req,
        });
    }
    schemaQuery(req) {
        return this._makeRequest({
            path: "schema/query",
            method: "post",
            body: req,
        });
    }
    schemaWrite(req) {
        return this._makeRequest({
            path: "schema/write",
            method: "post",
            body: req,
        });
    }
}
exports.DendronAPI = DendronAPI;
exports.DendronApiV2 = DendronAPI;
//# sourceMappingURL=api.js.map