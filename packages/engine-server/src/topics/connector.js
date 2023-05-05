"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EngineConnector = void 0;
const common_all_1 = require("@dendronhq/common-all");
const common_server_1 = require("@dendronhq/common-server");
const fs_extra_1 = __importDefault(require("fs-extra"));
const lodash_1 = __importDefault(require("lodash"));
const engineClient_1 = require("../engineClient");
const utils_1 = require("../utils");
class EngineConnector {
    static instance() {
        if (!this._ENGINE_CONNECTOR) {
            throw new common_all_1.DendronError({ message: "no workspace" });
        }
        return this._ENGINE_CONNECTOR;
    }
    static getOrCreate({ wsRoot, logger, force, }) {
        if (!this._ENGINE_CONNECTOR || force) {
            return new EngineConnector({ wsRoot, logger });
        }
        return this._ENGINE_CONNECTOR;
    }
    constructor({ wsRoot, logger }) {
        this.wsRoot = wsRoot;
        this.logger = logger || (0, common_server_1.createLogger)("connector");
        this.config = common_server_1.DConfig.getOrCreate(wsRoot);
        EngineConnector._ENGINE_CONNECTOR = this;
        this.initialized = false;
    }
    get vaults() {
        return common_all_1.ConfigUtils.getVaults(this.config);
    }
    /**
     * Connect with engine
     * @param opts
     * @returns
     */
    async init(opts) {
        const ctx = "EngineConnector:init";
        // init engine
        this.logger.info({ ctx, msg: "enter", opts });
        this.onReady = opts === null || opts === void 0 ? void 0 : opts.onReady;
        if (opts === null || opts === void 0 ? void 0 : opts.portOverride) {
            const engine = await this.tryToConnect({ port: opts.portOverride });
            if (!engine) {
                throw new common_all_1.DendronError({ message: "error connecting" });
            }
            await this.initEngine({
                engine,
                port: opts.portOverride,
                init: opts.init,
            });
        }
        else {
            return this.createServerWatcher({
                numRetries: opts === null || opts === void 0 ? void 0 : opts.numRetries,
                ...opts,
            });
        }
    }
    async initEngine(opts) {
        const ctx = "EngineConnector:initEngine";
        const { engine, port, init } = opts;
        this.logger.info({ ctx, msg: "enter", port, init });
        this.port = port;
        if (init) {
            await engine.init();
        }
        else {
            await engine.sync();
        }
        this._engine = engine;
        this.initialized = true;
        return engine;
    }
    async tryToConnect({ port }) {
        const ctx = "EngineConnector:tryToConnect";
        this.logger.info({ ctx, port, msg: "enter" });
        const { wsRoot, vaults } = this;
        const dendronEngine = engineClient_1.DendronEngineClient.create({
            port,
            ws: wsRoot,
            vaults,
            logger: this.logger,
        });
        const resp = await dendronEngine.info();
        if (resp.error) {
            this.logger.info({ ctx, msg: "can't connect", error: resp.error });
            return false;
        }
        else {
            this.logger.info({ ctx, msg: "connected", info: resp.data });
            return dendronEngine;
        }
    }
    get engine() {
        if (!this._engine) {
            throw Error("engine not set");
        }
        return this._engine;
    }
    async _connect(opts) {
        const resp = utils_1.EngineUtils.getPortFilePath(opts);
        const metaFpath = (0, utils_1.getWSMetaFilePath)(opts);
        const ctx = "EngineConnector:_connect";
        if (resp.error) {
            return false;
        }
        const portFilePath = resp.data;
        const wsMeta = (0, utils_1.openWSMetaFile)({ fpath: metaFpath });
        const wsActivation = wsMeta.activationTime;
        // get time when port was created
        const portCreated = common_all_1.Time.DateTime.fromJSDate(fs_extra_1.default.statSync(portFilePath).ctime).toMillis();
        this.logger.info({ ctx, portCreated, wsActivation });
        const port = (0, utils_1.openPortFile)({ fpath: portFilePath });
        this.logger.info({ ctx, msg: "initFromExistingFile", port });
        const maybeEngine = await this.tryToConnect({ port });
        if (maybeEngine) {
            return { engine: maybeEngine, port };
        }
        else {
            return false;
        }
    }
    async connectAndInit(opts) {
        const ctx = "EngineConnector:connectAndInit";
        return new Promise((resolve) => {
            setTimeout(async () => {
                const maybeEngine = await this._connect(opts);
                this.logger.info({ ctx, msg: "checking for engine" });
                if (maybeEngine) {
                    this.logger.info({ ctx, msg: "found engine" });
                    await this.initEngine({ ...maybeEngine, init: opts.init });
                    await (!lodash_1.default.isUndefined(this.onReady) && this.onReady({ ws: this }));
                    resolve(undefined);
                }
            }, 3000);
        });
    }
    async createServerWatcher(opts) {
        const ctx = "EngineConnector:createServerWatcher";
        const { wsRoot } = this;
        const { target } = lodash_1.default.defaults(opts, { target: "workspace" });
        const portFilePath = utils_1.EngineUtils.getPortFilePathForTarget({
            wsRoot,
            target,
        });
        this.logger.info({ ctx, msg: "enter", opts });
        // try to connect to file
        while (!this.initialized) {
            // eslint-disable-next-line no-await-in-loop
            await this.connectAndInit({ wsRoot, init: opts === null || opts === void 0 ? void 0 : opts.init });
        }
        // create file watcher in case file changes
        const { watcher } = await (0, common_server_1.createFileWatcher)({
            fpath: portFilePath,
            numTries: opts === null || opts === void 0 ? void 0 : opts.numRetries,
            onChange: async ({ fpath }) => {
                const port = (0, utils_1.openPortFile)({ fpath });
                this.logger.info({ ctx, msg: "fileWatcher:onChange", port });
                this.onChangePort({ port });
            },
            onCreate: async ({ fpath }) => {
                const port = (0, utils_1.openPortFile)({ fpath });
                this.logger.info({ ctx, msg: "fileWatcher:onCreate", port });
                this.onChangePort({ port });
            },
        });
        this.serverPortWatcher = watcher;
    }
    async onChangePort({ port }) {
        const ctx = "EngineConnector:onChangePort";
        const portPrev = this.port;
        this.logger.info({ ctx, port, portPrev });
        if (this.port !== port) {
            this.port = port;
            const maybeEngine = await this.tryToConnect({ port });
            if (maybeEngine) {
                this.initEngine({ engine: maybeEngine, port });
            }
            else {
                this.logger.info({ ctx, msg: "unable to connect" });
            }
        }
        if (lodash_1.default.isUndefined(portPrev) && this.onReady) {
            this.onReady({ ws: this });
        }
    }
}
exports.EngineConnector = EngineConnector;
//# sourceMappingURL=connector.js.map