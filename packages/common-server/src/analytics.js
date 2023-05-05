"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SegmentUtils = exports.SegmentClient = exports.TelemetryStatus = exports.SEGMENT_EVENTS = void 0;
const common_all_1 = require("@dendronhq/common-all");
const analytics_node_1 = __importDefault(require("analytics-node"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const lodash_1 = __importDefault(require("lodash"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const system_1 = require("./system");
const logger_1 = require("./logger");
var SiteEvents;
(function (SiteEvents) {
    SiteEvents["PUBLISH_CLICKED"] = "sitePublishClick";
    SiteEvents["SOURCE_INFO_ENTER"] = "sitePublishInfoEnter";
    SiteEvents["CREATED"] = "siteCreate";
    SiteEvents["UPDATE_START"] = "siteUpdateStart";
    SiteEvents["UPDATE_STOP"] = "siteUpdateStop";
    SiteEvents["VISIT_SITE"] = "siteVisit";
})(SiteEvents || (SiteEvents = {}));
var SubscriptionEvents;
(function (SubscriptionEvents) {
    SubscriptionEvents["CREATED"] = "subscriptionCreated";
})(SubscriptionEvents || (SubscriptionEvents = {}));
// === Types
var CompletionStatus;
(function (CompletionStatus) {
    CompletionStatus["OK"] = "ok";
})(CompletionStatus || (CompletionStatus = {}));
var UserTier;
(function (UserTier) {
    UserTier["SEED"] = "seed";
})(UserTier || (UserTier = {}));
exports.SEGMENT_EVENTS = {
    SiteEvents,
    SubscriptionEvents,
};
var TelemetryStatus;
(function (TelemetryStatus) {
    /** The user set that telemetry should be disabled in the workspace config. */
    TelemetryStatus["DISABLED_BY_WS_CONFIG"] = "disabled by ws config";
    /** The user set that telemetry should be disabled in VSCode settings. */
    TelemetryStatus["DISABLED_BY_VSCODE_CONFIG"] = "disabled by vscode config";
    /** The user used the Disable Telemetry command to disable telemetry. */
    TelemetryStatus["DISABLED_BY_COMMAND"] = "disabled by command";
    /** The user disabled telemetry using dendron-cli */
    TelemetryStatus["DISABLED_BY_CLI_COMMAND"] = "disabled by cli command";
    /** The user disabled telemetry in configuration, but used the Enable Telemetry command to give permission. */
    TelemetryStatus["ENABLED_BY_COMMAND"] = "enabled by command";
    /** The user allowed telemetry by configuration. */
    TelemetryStatus["ENABLED_BY_CONFIG"] = "enabled by config";
    /** The user did not opt out of telemetry prior to 0.46.0 update */
    TelemetryStatus["ENABLED_BY_MIGRATION"] = "enabled by migration";
    /** The user enabled telemetry using dendron-cli */
    TelemetryStatus["ENABLED_BY_CLI_COMMAND"] = "enabled by cli command";
    /** The user used dendron-cli before setting telemetry with vscode or plugin */
    TelemetryStatus["ENABLED_BY_CLI_DEFAULT"] = "enabled by cli default";
})(TelemetryStatus = exports.TelemetryStatus || (exports.TelemetryStatus = {}));
var SegmentResidualFlushStatus;
(function (SegmentResidualFlushStatus) {
    SegmentResidualFlushStatus[SegmentResidualFlushStatus["success"] = 0] = "success";
    SegmentResidualFlushStatus[SegmentResidualFlushStatus["retryableError"] = 1] = "retryableError";
    SegmentResidualFlushStatus[SegmentResidualFlushStatus["nonRetryableError"] = 2] = "nonRetryableError";
})(SegmentResidualFlushStatus || (SegmentResidualFlushStatus = {}));
class SegmentClient {
    /**
     * This is used to _unlock_ Segment client.
     * Before this is called, calling {@link SegmentClient.instance()} will throw an error.
     * This is to prevent accidental instantiation during module load time, as this will globally affect
     * how clients report data.
     */
    static unlock() {
        this._locked = false;
    }
    static instance(opts) {
        if (this._locked) {
            const message = `
        You are trying to instantiate Segment client before _activate.
        Please check that your code change isn't unexpectedly instantiating the Segment client
        during module load time.
      `;
            throw new common_all_1.DendronError({
                message,
                payload: {
                    message,
                },
            });
        }
        else {
            if (lodash_1.default.isUndefined(this._singleton) || (opts === null || opts === void 0 ? void 0 : opts.forceNew)) {
                this._singleton = new SegmentClient(opts);
            }
            return this._singleton;
        }
    }
    /** Legacy: If exists, Dendron telemetry has been disabled. */
    static getDisableConfigPath() {
        return path_1.default.join(os_1.default.homedir(), common_all_1.CONSTANTS.DENDRON_NO_TELEMETRY);
    }
    /** May contain configuration for Dendron telemetry. */
    static getConfigPath() {
        return path_1.default.join(os_1.default.homedir(), common_all_1.CONSTANTS.DENDRON_TELEMETRY);
    }
    static readConfig() {
        try {
            return fs_extra_1.default.readJSONSync(this.getConfigPath());
        }
        catch {
            return undefined;
        }
    }
    static getStatus() {
        // Legacy, this file would have been created if the user used the Dendron Disable command
        if (fs_extra_1.default.existsSync(this.getDisableConfigPath()))
            return TelemetryStatus.DISABLED_BY_COMMAND;
        const config = this.readConfig();
        // This is actually ambiguous, could have been using the command or by default.
        if (lodash_1.default.isUndefined(config))
            return TelemetryStatus.ENABLED_BY_CONFIG;
        return config.status;
    }
    static isDisabled(status) {
        if (lodash_1.default.isUndefined(status))
            status = this.getStatus();
        switch (status) {
            case TelemetryStatus.DISABLED_BY_COMMAND:
            case TelemetryStatus.DISABLED_BY_CLI_COMMAND:
            case TelemetryStatus.DISABLED_BY_VSCODE_CONFIG:
            case TelemetryStatus.DISABLED_BY_WS_CONFIG:
                return true;
            default:
                return false;
        }
    }
    static isEnabled(status) {
        return !this.isDisabled(status);
    }
    static enable(why) {
        // try to remove the legacy disable, if it exists
        try {
            fs_extra_1.default.removeSync(this.getDisableConfigPath());
        }
        catch {
            // expected, legacy disable config is missing.
        }
        fs_extra_1.default.writeJSONSync(this.getConfigPath(), { status: why });
    }
    static disable(why) {
        fs_extra_1.default.writeJSONSync(this.getConfigPath(), { status: why });
    }
    constructor(_opts) {
        const { key, disabledByWorkspace } = lodash_1.default.defaults(_opts, {
            key: (0, common_all_1.env)("SEGMENT_VSCODE_KEY"),
            disabledByWorkspace: false,
        });
        this.logger = (0, logger_1.createLogger)("SegmentClient");
        this._segmentInstance = new analytics_node_1.default(key);
        this._cachePath = _opts === null || _opts === void 0 ? void 0 : _opts.cachePath;
        if (!(_opts === null || _opts === void 0 ? void 0 : _opts.cachePath)) {
            this.logger.info("No cache path for Segment specified. Failed event uploads will not be retried.");
        }
        const status = SegmentClient.getStatus();
        this.logger.info({ msg: `user telemetry setting: ${status}` });
        this._hasOptedOut = SegmentClient.isDisabled() || disabledByWorkspace;
        if (this.hasOptedOut) {
            this._anonymousId = "";
            return;
        }
        const uuidPath = path_1.default.join(os_1.default.homedir(), common_all_1.CONSTANTS.DENDRON_ID);
        this.logger.info({ msg: "telemetry initializing" });
        if (fs_extra_1.default.existsSync(uuidPath)) {
            this.logger.info({ msg: "using existing id" });
            this._anonymousId = lodash_1.default.trim(fs_extra_1.default.readFileSync(uuidPath, { encoding: "utf8" }));
        }
        else {
            this.logger.info({ msg: "creating new id" });
            this._anonymousId = (0, common_all_1.genUUID)();
            fs_extra_1.default.writeFileSync(uuidPath, this._anonymousId);
        }
        this.logger.info({ msg: "anonymous id", anonymousId: this._anonymousId });
    }
    identifyAnonymous(props, opts) {
        this.identify(undefined, props, opts);
    }
    identify(id, props, opts) {
        if (common_all_1.RuntimeUtils.isRunningInTestOrCI()) {
            return;
        }
        if (this._hasOptedOut || this._segmentInstance == null) {
            return;
        }
        try {
            const { context } = opts || {};
            const identifyOpts = {
                anonymousId: this._anonymousId,
                traits: props,
                context,
            };
            if (id) {
                identifyOpts.userId = id;
            }
            this._segmentInstance.identify(identifyOpts);
            this._segmentInstance.flush();
        }
        catch (ex) {
            this.logger.error(ex);
        }
    }
    /**
     * Track an event with Segment. If the event fails to upload for any reason,
     * it will be saved to a residual cache file, which will be retried at a later
     * point.
     * @param event
     * @param data
     * @param opts
     * @returns a Promise which resolves when either the event has been
     * successfully uploaded to Segment or has been written to the cache file. It
     * is not recommended to await this function for metrics tracking.
     */
    async track(opts) {
        var _a;
        if (this._hasOptedOut || this._segmentInstance == null) {
            return;
        }
        const resp = await this.trackInternal(opts);
        if (resp.error && this._cachePath) {
            try {
                await this.writeToResidualCache(this._cachePath, {
                    event: opts.event,
                    properties: opts.properties,
                    context: opts.context,
                    timestamp: (_a = resp.data) === null || _a === void 0 ? void 0 : _a.timestamp,
                    integrations: opts.integrations,
                });
            }
            catch (err) {
                this.logger.error(new common_all_1.DendronError({
                    message: "Failed to write to segment residual cache: " + err,
                }));
            }
        }
    }
    async trackInternal({ event, properties, context, timestamp, integrations, }) {
        return new Promise((resolve) => {
            if (!lodash_1.default.isUndefined(timestamp)) {
                timestamp || (timestamp = new Date(timestamp));
            }
            this._segmentInstance.track({
                anonymousId: this._anonymousId,
                event,
                properties,
                timestamp,
                context,
                integrations,
            }, (err) => {
                if (err) {
                    this.logger.info("Failed to send event " + event);
                    let eventTime;
                    try {
                        eventTime = new Date(JSON.parse(err.config.data).timestamp);
                    }
                    catch (err) {
                        eventTime = new Date();
                    }
                    resolve({
                        data: {
                            event,
                            properties,
                            context,
                            timestamp: eventTime,
                            integrations,
                        },
                        error: new common_all_1.DendronError({
                            message: "Failed to send event " + event,
                            innerError: err,
                        }),
                    });
                }
                resolve({ error: null });
            });
        });
    }
    /**
     * Writes a tracked data point to the residual cache file. If the file exceeds
     * 5Mb than the write will fail silently.
     * @param filename
     * @param data
     * @returns
     */
    async writeToResidualCache(filename, data) {
        return new Promise((resolve) => {
            // Stop writing if the file gets more than 5 MB.
            if (fs_extra_1.default.pathExistsSync(filename) &&
                fs_extra_1.default.statSync(filename).size / (1024 * 1024) > 5) {
                return resolve();
            }
            const stream = fs_extra_1.default.createWriteStream(filename, { flags: "as" });
            stream.write(JSON.stringify(data) + "\n");
            stream.on("finish", () => {
                resolve();
            });
            stream.end();
        });
    }
    /**
     * Tries to upload data in the residual cache file to Segment. A separate
     * attempt is made to upload each data point - if any fail due to a retryable
     * error (such as no network), then it is kept in the cache file for the next
     * iteration. Any successfully uploaded data points or data deemed as a
     * non-recoverable error (for example, invalid format) are removed.
     * @returns
     */
    async tryFlushResidualCache() {
        this.logger.info("Attempting to flush residual segment data from file.");
        let successCount = 0;
        let nonRetryableErrorCount = 0;
        let retryableErrorCount = 0;
        if (!this._cachePath) {
            return {
                successCount,
                nonRetryableErrorCount,
                retryableErrorCount,
            };
        }
        const buff = await fs_extra_1.default.readFile(this._cachePath, "utf-8");
        const promises = [];
        // Filter blank or whitespace lines:
        const eventLines = buff
            .split(/\r?\n/)
            .filter((line) => line !== null && line.match(/^ *$/) === null);
        eventLines.forEach((line) => {
            const singleTry = new Promise((resolve) => {
                try {
                    const data = JSON.parse(line);
                    if (data.event === undefined || data.properties === undefined) {
                        resolve(SegmentResidualFlushStatus.nonRetryableError);
                    }
                    const promised = this.trackInternal({
                        event: data.event,
                        properties: data.properties,
                        context: data.context,
                        timestamp: data.timestamp,
                    });
                    promised
                        .then((resp) => {
                        resolve(resp.error
                            ? SegmentResidualFlushStatus.retryableError
                            : SegmentResidualFlushStatus.success);
                    })
                        .catch(() => {
                        resolve(SegmentResidualFlushStatus.nonRetryableError);
                    });
                }
                catch (err) {
                    resolve(SegmentResidualFlushStatus.nonRetryableError);
                }
            });
            promises.push(singleTry);
        }, this);
        const result = await Promise.all(promises);
        const nonRetryIndex = [];
        result.forEach((value, index) => {
            switch (value) {
                case SegmentResidualFlushStatus.success:
                    successCount += 1;
                    nonRetryIndex.push(index);
                    break;
                case SegmentResidualFlushStatus.nonRetryableError:
                    nonRetryableErrorCount += 1;
                    nonRetryIndex.push(index);
                    break;
                case SegmentResidualFlushStatus.retryableError:
                    retryableErrorCount += 1;
                    break;
                default:
                    break;
            }
        });
        await fs_extra_1.default.writeFile(this._cachePath, eventLines
            .filter((_value, index) => !nonRetryIndex.includes(index))
            .join("\n"));
        const stats = {
            successCount,
            nonRetryableErrorCount,
            retryableErrorCount,
        };
        if (successCount > 0) {
            this.track({
                event: "Segment_Residual_Data_Recovered",
                properties: stats,
            });
        }
        return stats;
    }
    get hasOptedOut() {
        return this._hasOptedOut;
    }
    get anonymousId() {
        return this._anonymousId;
    }
}
SegmentClient._locked = true;
exports.SegmentClient = SegmentClient;
class SegmentUtils {
    static _trackCommon({ event, context, platformProps, properties, integrations, timestamp, }) {
        if (common_all_1.RuntimeUtils.isRunningInTestOrCI()) {
            return;
        }
        const { type, ...rest } = platformProps;
        const _properties = {
            ...properties,
            ...SegmentUtils.getCommonProps(),
            userAgent: type,
            ...rest,
        };
        return SegmentClient.instance().track({
            event,
            properties: _properties,
            context,
            integrations,
            timestamp,
        });
    }
    /**
     * Async tracking. Do not await this method as track calls can take ~8s to finish
     */
    static async track(opts) {
        return this._trackCommon(opts);
    }
    /**
     * Sync tracking. NOTE that the downstream function must await this function in order for this to be synchronous
     * @param opts
     * @returns
     */
    static async trackSync(opts) {
        return this._trackCommon(opts);
    }
    static identify(identifyProps) {
        if (common_all_1.RuntimeUtils.isRunningInTestOrCI()) {
            return;
        }
        if (identifyProps.type === common_all_1.AppNames.CODE) {
            const { appVersion, userAgent, ...rest } = identifyProps;
            SegmentClient.instance().identifyAnonymous({
                ...SegmentUtils.getCommonProps(),
                ...rest,
                os: (0, system_1.getOS)(),
            }, {
                context: {
                    app: {
                        version: appVersion,
                    },
                    os: {
                        name: (0, system_1.getOS)(),
                    },
                    userAgent,
                },
            });
        }
        if (identifyProps.type === common_all_1.AppNames.CLI) {
            const { cliVersion } = identifyProps;
            SegmentClient.instance().identifyAnonymous({
                ...SegmentUtils.getCommonProps(),
                cliVersion,
            }, {
                context: {
                    app: {
                        name: "dendron-cli",
                        version: cliVersion,
                    },
                    os: {
                        name: (0, system_1.getOS)(),
                    },
                },
            });
        }
    }
    static getCommonProps() {
        return {
            arch: process.arch,
            nodeVersion: process.version,
        };
    }
}
exports.SegmentUtils = SegmentUtils;
//# sourceMappingURL=analytics.js.map