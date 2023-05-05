"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublishCLICommand = exports.PublishCommands = void 0;
const common_all_1 = require("@dendronhq/common-all");
const engine_server_1 = require("@dendronhq/engine-server");
const pods_core_1 = require("@dendronhq/pods-core");
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
const cli_1 = require("../utils/cli");
const base_1 = require("./base");
const exportPod_1 = require("./exportPod");
const pod_1 = require("./pod");
const prompts_1 = __importDefault(require("prompts"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const ora_1 = __importDefault(require("ora"));
const common_server_1 = require("@dendronhq/common-server");
var PublishCommands;
(function (PublishCommands) {
    /**
     * Initiliaze the nextjs-template from Dendron in the dendron workspace
     */
    PublishCommands["INIT"] = "init";
    /**
     * Create metadata needed to builid dendron nextjs template
     */
    PublishCommands["BUILD"] = "build";
    /**
     * Builds the website
     */
    PublishCommands["DEV"] = "dev";
    /**
     * Export website
     */
    PublishCommands["EXPORT"] = "export";
})(PublishCommands = exports.PublishCommands || (exports.PublishCommands = {}));
const getNextRoot = (wsRoot) => {
    return path_1.default.join(wsRoot, ".next");
};
const isBuildOverrideKey = (key) => {
    const allowedKeys = [
        "siteUrl",
        "assetsPrefix",
    ];
    return allowedKeys.includes(key);
};
/**
 * To use when working on dendron
 */
class PublishCLICommand extends base_1.CLICommand {
    constructor() {
        super({
            name: "publish <cmd>",
            desc: "commands for publishing notes",
        });
    }
    buildArgs(args) {
        super.buildArgs(args);
        args.positional("cmd", {
            describe: "a command to run",
            choices: Object.values(PublishCommands),
            type: "string",
        });
        args.option("dest", {
            describe: "override where nextjs-template is located",
            type: "string",
        });
        args.option("attach", {
            describe: "use existing dendron engine instead of spawning a new one",
            type: "boolean",
        });
        args.option("noBuild", {
            describe: "skip building notes",
            type: "boolean",
            default: false,
        });
        args.option("overrides", {
            describe: "override existing siteConfig properties",
            type: "string",
        });
        args.option("target", {
            describe: "export to specific destination",
            choices: lodash_1.default.values(pods_core_1.PublishTarget),
        });
        args.option("yes", {
            describe: "automatically say yes to all prompts",
            type: "boolean",
        });
        args.option("sitemap", {
            describe: "generates a sitemap: https://en.wikipedia.org/wiki/Site_map",
            type: "boolean",
        });
    }
    async enrichArgs(args) {
        this.addArgsToPayload({ cmd: args.cmd });
        let error;
        const coverrides = {};
        if (!lodash_1.default.isUndefined(args.overrides)) {
            args.overrides.split(",").map((ent) => {
                const [k, v] = lodash_1.default.trim(ent).split("=");
                if (isBuildOverrideKey(k)) {
                    coverrides[k] = v;
                }
                else {
                    error = new common_all_1.DendronError({
                        message: `bad key for override. ${k} is not a valid key`,
                    });
                }
            });
        }
        if (error) {
            return { error };
        }
        return {
            data: { ...lodash_1.default.omit(args, "overrides"), overrides: coverrides },
        };
    }
    async execute(opts) {
        const { cmd } = opts;
        const ctx = "execute";
        this.L.info({ ctx });
        const spinner = (0, ora_1.default)().start();
        try {
            switch (cmd) {
                case PublishCommands.INIT: {
                    const out = await this.init({ ...opts, spinner });
                    spinner.stop();
                    return out;
                }
                case PublishCommands.BUILD: {
                    spinner.stop();
                    return this.build(opts);
                }
                case PublishCommands.DEV: {
                    const { wsRoot } = opts;
                    const isInitialized = await this._isInitialized({ wsRoot, spinner });
                    if (!isInitialized) {
                        await this.init({ ...opts, spinner });
                    }
                    if (opts.noBuild) {
                        cli_1.SpinnerUtils.renderAndContinue({
                            spinner,
                            text: "skipping build...",
                        });
                    }
                    else {
                        spinner.stop();
                        await this.build(opts);
                    }
                    await this.dev(opts);
                    return { error: null };
                }
                case PublishCommands.EXPORT: {
                    const { wsRoot } = opts;
                    const isInitialized = await this._isInitialized({ wsRoot, spinner });
                    if (!isInitialized) {
                        await this.init({ ...opts, spinner });
                    }
                    if (opts.noBuild) {
                        cli_1.SpinnerUtils.renderAndContinue({
                            spinner,
                            text: "skipping build...",
                        });
                    }
                    else {
                        await this.build(opts);
                    }
                    spinner.stop();
                    await this.export(opts);
                    if (opts.target) {
                        await this._handlePublishTarget(opts.target, opts);
                    }
                    return { error: null };
                }
                default:
                    (0, common_all_1.assertUnreachable)(cmd);
            }
        }
        catch (err) {
            this.L.error(err);
            if (err instanceof common_all_1.DendronError) {
                this.print(["status:", err.status, err.message].join(" "));
            }
            else {
                this.print("unknown error " + (0, common_all_1.error2PlainObject)(err));
            }
            return { error: err };
        }
    }
    async _buildNextData({ wsRoot, stage, dest, attach, overrides, }) {
        const cli = new exportPod_1.ExportPodCLICommand();
        // create config string
        const podConfig = {
            dest: dest || getNextRoot(wsRoot),
        };
        const resp = await cli.enrichArgs({
            podId: pods_core_1.NextjsExportPod.id,
            podSource: pod_1.PodSource.BUILTIN,
            wsRoot,
            config: cli_1.CLIUtils.objectConfig2StringConfig(podConfig),
            attach,
        });
        if (resp.error) {
            return { error: resp.error };
        }
        const opts = resp.data;
        opts.config.overrides = overrides || {};
        // if no siteUrl set, override with localhost
        const config = common_server_1.DConfig.readConfigSync(opts.engine.wsRoot);
        const publishingConfig = common_all_1.ConfigUtils.getPublishing(config);
        if (stage !== "prod") {
            if (!publishingConfig.siteUrl && !(overrides === null || overrides === void 0 ? void 0 : overrides.siteUrl)) {
                lodash_1.default.set(opts.config.overrides, "siteUrl", "localhost:3000");
            }
        }
        const { error } = engine_server_1.SiteUtils.validateConfig(publishingConfig);
        if (error) {
            return { error };
        }
        return { data: await cli.execute(opts) };
    }
    async _handlePublishTarget(target, opts) {
        const { wsRoot } = opts;
        switch (target) {
            case pods_core_1.PublishTarget.GITHUB: {
                const docsPath = path_1.default.join(wsRoot, "docs");
                const outPath = path_1.default.join(wsRoot, ".next", "out");
                this.print("building github target...");
                // if `out` no exist, exit
                if (!fs_extra_1.default.pathExistsSync(outPath)) {
                    this.print(`${outPath} does not exist. exiting`);
                    return;
                }
                // if docs exist, remove
                const docsExist = fs_extra_1.default.pathExistsSync(docsPath);
                if (docsExist) {
                    if (!opts.yes) {
                        const response = await (0, prompts_1.default)({
                            type: "confirm",
                            name: "value",
                            message: "Docs folder exists. Delete?",
                            initial: false,
                        });
                        if (!response.value) {
                            this.print("exiting");
                            return;
                        }
                    }
                    fs_extra_1.default.removeSync(docsPath);
                }
                // build docs
                fs_extra_1.default.moveSync(outPath, docsPath);
                fs_extra_1.default.ensureFileSync(path_1.default.join(docsPath, ".nojekyll"));
                this.print(`done export. files available at ${docsPath}`);
                return;
            }
            default:
                (0, common_all_1.assertUnreachable)(target);
        }
    }
    async init(opts) {
        const { wsRoot, spinner } = opts;
        common_server_1.GitUtils.addToGitignore({ addPath: ".next", root: wsRoot });
        const nextPath = pods_core_1.NextjsExportPodUtils.getNextRoot(wsRoot);
        const nextPathExists = await this._nextPathExists({
            nextPath,
            spinner,
        });
        if (nextPathExists) {
            try {
                await this._updateNextTemplate({
                    nextPath,
                    spinner,
                });
            }
            catch (err) {
                cli_1.SpinnerUtils.renderAndContinue({
                    spinner,
                    text: `failed to update next NextJS template working copy (${err}); cloning fresh`,
                });
                await this._removeNextPath({
                    nextPath,
                    spinner,
                });
                await this._initialize({ nextPath, spinner });
            }
        }
        else {
            await this._initialize({ nextPath, spinner });
        }
        return { error: null };
    }
    async _isInitialized(opts) {
        const { spinner, wsRoot } = opts;
        spinner.start();
        cli_1.SpinnerUtils.renderAndContinue({
            spinner,
            text: "checking if NextJS template is initialized",
        });
        const isInitialized = await pods_core_1.NextjsExportPodUtils.isInitialized({
            wsRoot,
        });
        cli_1.SpinnerUtils.renderAndContinue({
            spinner,
            text: `NextJS template is ${isInitialized ? "already" : "not"} initialized.`,
        });
        return isInitialized;
    }
    async _nextPathExists(opts) {
        const { spinner, nextPath } = opts;
        const nextPathBase = path_1.default.basename(nextPath);
        cli_1.SpinnerUtils.renderAndContinue({
            spinner,
            text: `checking if ${nextPathBase} directory exists.`,
        });
        const nextPathExists = await pods_core_1.NextjsExportPodUtils.nextPathExists({
            nextPath,
        });
        cli_1.SpinnerUtils.renderAndContinue({
            spinner,
            text: `${nextPathBase} directory ${nextPathExists ? "exists" : "does not exist"}`,
        });
        return nextPathExists;
    }
    async _updateNextTemplate(opts) {
        const { spinner, nextPath } = opts;
        cli_1.SpinnerUtils.renderAndContinue({
            spinner,
            text: `updating NextJS template.`,
        });
        await pods_core_1.NextjsExportPodUtils.updateTemplate({
            nextPath,
        });
        await this._installDependencies(opts);
        cli_1.SpinnerUtils.renderAndContinue({
            spinner,
            text: `updated NextJS template.`,
        });
    }
    async _removeNextPath(opts) {
        const { spinner, nextPath } = opts;
        const nextPathBase = path_1.default.basename(nextPath);
        await pods_core_1.NextjsExportPodUtils.removeNextPath({
            nextPath,
        });
        cli_1.SpinnerUtils.renderAndContinue({
            spinner,
            text: `existing ${nextPathBase} directory deleted.`,
        });
    }
    async _initialize(opts) {
        const { spinner } = opts;
        cli_1.SpinnerUtils.renderAndContinue({
            spinner,
            text: "Initializing NextJS template.",
        });
        await this._cloneTemplate(opts);
        await this._installDependencies(opts);
    }
    async _cloneTemplate(opts) {
        const { nextPath, spinner } = opts;
        spinner.stop();
        spinner.start("Cloning NextJS template...");
        await pods_core_1.NextjsExportPodUtils.cloneTemplate({ nextPath });
        cli_1.SpinnerUtils.renderAndContinue({
            spinner,
            text: "Successfully cloned.",
        });
    }
    async _installDependencies(opts) {
        const { nextPath, spinner } = opts;
        spinner.stop();
        spinner.start("Installing dependencies... This may take a while.");
        await pods_core_1.NextjsExportPodUtils.installDependencies({ nextPath });
        cli_1.SpinnerUtils.renderAndContinue({
            spinner,
            text: "All dependencies installed.",
        });
    }
    async build({ wsRoot, dest, attach, overrides, sitemap }) {
        this.print(`generating metadata for publishing...`);
        const { error } = await this._buildNextData({
            wsRoot,
            stage: (0, common_all_1.getStage)(),
            dest,
            attach,
            overrides,
        });
        if (error) {
            this.print("ERROR: " + error.message);
            return { error };
        }
        if (sitemap) {
            const nextPath = pods_core_1.NextjsExportPodUtils.getNextRoot(wsRoot);
            await pods_core_1.NextjsExportPodUtils.buildSiteMap({ nextPath });
        }
        return { error: null };
    }
    async dev(opts) {
        const nextPath = pods_core_1.NextjsExportPodUtils.getNextRoot(opts.wsRoot);
        await pods_core_1.NextjsExportPodUtils.startNextDev({ nextPath, windowsHide: false });
        return { error: null };
    }
    async export(opts) {
        const nextPath = pods_core_1.NextjsExportPodUtils.getNextRoot(opts.wsRoot);
        await pods_core_1.NextjsExportPodUtils.startNextExport({ nextPath });
    }
}
exports.PublishCLICommand = PublishCLICommand;
//# sourceMappingURL=publishCLICommand.js.map