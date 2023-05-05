"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevCLICommand = exports.DevCommands = void 0;
const common_all_1 = require("@dendronhq/common-all");
const common_server_1 = require("@dendronhq/common-server");
const engine_server_1 = require("@dendronhq/engine-server");
const fs_extra_1 = __importDefault(require("fs-extra"));
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
const __1 = require("..");
const build_1 = require("../utils/build");
const base_1 = require("./base");
var DevCommands;
(function (DevCommands) {
    DevCommands["GENERATE_JSON_SCHEMA_FROM_CONFIG"] = "generate_json_schema_from_config";
    DevCommands["BUILD"] = "build";
    DevCommands["CREATE_TEST_VAULT"] = "create_test_vault";
    DevCommands["BUMP_VERSION"] = "bump_version";
    DevCommands["PUBLISH"] = "publish";
    DevCommands["SYNC_ASSETS"] = "sync_assets";
    DevCommands["SYNC_TUTORIAL"] = "sync_tutorial";
    DevCommands["PREP_PLUGIN"] = "prep_plugin";
    DevCommands["PACKAGE_PLUGIN"] = "package_plugin";
    DevCommands["INSTALL_PLUGIN"] = "install_plugin";
    DevCommands["ENABLE_TELEMETRY"] = "enable_telemetry";
    DevCommands["DISABLE_TELEMETRY"] = "disable_telemetry";
    DevCommands["SHOW_TELEMETRY"] = "show_telemetry";
    DevCommands["SHOW_MIGRATIONS"] = "show_migrations";
    DevCommands["RUN_MIGRATION"] = "run_migration";
})(DevCommands = exports.DevCommands || (exports.DevCommands = {}));
/**
 * To use when working on dendron
 */
class DevCLICommand extends base_1.CLICommand {
    constructor() {
        super({
            name: "dev <cmd>",
            desc: "commands related to development of Dendron",
        });
        this.wsRootOptional = true;
        this.skipValidation = true;
    }
    setEndpoint(publishEndpoint) {
        this.print(`setting endpoint to ${publishEndpoint}...`);
        if (publishEndpoint === build_1.PublishEndpoint.LOCAL) {
            build_1.BuildUtils.prepPublishLocal();
        }
        else {
            build_1.BuildUtils.prepPublishRemote();
        }
    }
    buildArgs(args) {
        super.buildArgs(args);
        args.positional("cmd", {
            describe: "a command to run",
            choices: Object.values(DevCommands),
            type: "string",
        });
        args.option("upgradeType", {
            describe: "how to do upgrade",
            choices: Object.values(build_1.SemverVersion),
        });
        args.option("publishEndpoint", {
            describe: "where to publish",
            choices: Object.values(build_1.PublishEndpoint),
        });
        args.option("extensionType", {
            describe: "extension name to publish in the marketplace (Dendron / Nightly)",
            choices: Object.values(build_1.ExtensionType),
        });
        args.option("extensionTarget", {
            describe: "extension target to pass to vsce to specify platform and architecture",
        });
        args.option("fast", {
            describe: "skip some checks",
        });
        args.option("skipSentry", {
            describe: "skip upload source map to sentry",
        });
        args.option("migrationVersion", {
            describe: "migration version to run",
            choices: engine_server_1.MIGRATION_ENTRIES.map((m) => m.version),
        });
        args.option("wsRoot", {
            describe: "root directory of the Dendron workspace",
        });
        args.option("jsonData", {
            describe: "json data to pass into command",
        });
    }
    async enrichArgs(args) {
        this.addArgsToPayload({ cmd: args.cmd });
        return { data: { ...args } };
    }
    async createTestVault({ wsRoot, payload, }) {
        fs_extra_1.default.ensureDirSync(wsRoot);
        fs_extra_1.default.emptyDirSync(wsRoot);
        this.print(`creating test vault with ${JSON.stringify(payload)}`);
        const vaults = lodash_1.default.times(payload.numVaults, (idx) => {
            return { fsPath: `vault${idx}` };
        });
        const svc = await engine_server_1.WorkspaceService.createWorkspace({
            additionalVaults: vaults,
            wsVault: { fsPath: "notes", selfContained: true },
            wsRoot,
            createCodeWorkspace: false,
            useSelfContainedVault: true,
        });
        await svc.initialize();
        const ratioTotal = lodash_1.default.values(payload.ratios).reduce((acc, cur) => acc + cur, 0);
        const vaultTotal = payload.numVaults;
        const { engine, server } = await (0, __1.setupEngine)({ wsRoot });
        this.print(`vaults: ${JSON.stringify(svc.vaults)}`);
        await Promise.all(lodash_1.default.keys(payload.ratios).map(async (key) => {
            const numNotes = Math.round((payload.ratios[key] /
                ratioTotal) *
                payload.numNotes);
            this.print(`creating ${numNotes} ${key} notes...`);
            const vault = svc.vaults[lodash_1.default.random(0, vaultTotal - 1)];
            const notes = await Promise.all(lodash_1.default.times(numNotes, async (i) => {
                return common_all_1.NoteUtils.create({ fname: `${key}.${i}`, vault });
            }));
            await engine.bulkWriteNotes({ notes });
        }));
        return { server };
    }
    async generateJSONSchemaFromConfig() {
        const repoRoot = process.cwd();
        const pkgRoot = path_1.default.join(repoRoot, "packages", "engine-server");
        const commonOutputPath = path_1.default.join(repoRoot, "packages", "common-all", "data", "dendron-yml.validator.json");
        const pluginOutputPath = path_1.default.join(repoRoot, "packages", "plugin-core", "dist", "dendron-yml.validator.json");
        const configType = "ConfigForSchemaGenerator";
        // NOTE: this is removed by webpack when building plugin which is why we're loading this dynamically
        // eslint-disable-next-line global-require
        const tsj = require("ts-json-schema-generator");
        const schema = tsj
            .createGenerator({
            path: path_1.default.join(pkgRoot, "src", "config.ts"),
            tsconfig: path_1.default.join(pkgRoot, "tsconfig.build.json"),
            type: configType,
            skipTypeCheck: true,
        })
            .createSchema(configType);
        const schemaString = JSON.stringify(schema, null, 2);
        fs_extra_1.default.ensureDirSync(path_1.default.dirname(pluginOutputPath));
        await Promise.all([
            fs_extra_1.default.writeFile(commonOutputPath, schemaString),
            fs_extra_1.default.writeFile(pluginOutputPath, schemaString),
        ]);
        return;
    }
    async execute(opts) {
        const { cmd } = opts;
        const ctx = "execute";
        this.L.info({ ctx });
        try {
            switch (cmd) {
                case DevCommands.GENERATE_JSON_SCHEMA_FROM_CONFIG: {
                    await this.generateJSONSchemaFromConfig();
                    return { error: null };
                }
                case DevCommands.BUILD: {
                    if (!this.validateBuildArgs(opts)) {
                        return {
                            error: new common_all_1.DendronError({
                                message: "missing options for build command",
                            }),
                        };
                    }
                    await this.build(opts);
                    return { error: null };
                }
                case DevCommands.CREATE_TEST_VAULT: {
                    if (!this.validateCreateTestVaultArgs(opts)) {
                        return {
                            error: new common_all_1.DendronError({
                                message: "missing required options",
                            }),
                        };
                    }
                    const { wsRoot, jsonData } = opts;
                    const payload = fs_extra_1.default.readJSONSync(jsonData);
                    this.print(`reading json data from ${jsonData}`);
                    const { server } = await this.createTestVault({ wsRoot, payload });
                    if (server.close) {
                        this.print("closing server...");
                        server.close();
                    }
                    return { error: null };
                }
                case DevCommands.BUMP_VERSION: {
                    if (!this.validateBumpVersionArgs(opts)) {
                        return {
                            error: new common_all_1.DendronError({
                                message: "missing options for build command",
                            }),
                        };
                    }
                    await this.bumpVersion(opts);
                    return { error: null };
                }
                case DevCommands.SYNC_ASSETS: {
                    await this.syncAssets(opts);
                    return { error: null };
                }
                case DevCommands.SYNC_TUTORIAL: {
                    this.syncTutorial();
                    return { error: null };
                }
                case DevCommands.PUBLISH: {
                    if (!opts.publishEndpoint) {
                        return {
                            error: new common_all_1.DendronError({
                                message: "missing options for cmd",
                            }),
                        };
                    }
                    try {
                        this.setEndpoint(opts.publishEndpoint);
                        await build_1.LernaUtils.publishVersion(opts.publishEndpoint);
                    }
                    finally {
                        if (opts.publishEndpoint === build_1.PublishEndpoint.LOCAL) {
                            build_1.BuildUtils.setRegRemote();
                        }
                    }
                    return { error: null };
                }
                case DevCommands.PREP_PLUGIN: {
                    if (!this.validatePrepPluginArgs(opts)) {
                        return {
                            error: new common_all_1.DendronError({
                                message: "missing options for prep_plugin command",
                            }),
                        };
                    }
                    await build_1.BuildUtils.prepPluginPkg(opts.extensionType);
                    return { error: null };
                }
                case DevCommands.PACKAGE_PLUGIN: {
                    if (!opts.fast) {
                        this.print("install deps...");
                        build_1.BuildUtils.installPluginDependencies();
                    }
                    this.print("compiling plugin...");
                    await build_1.BuildUtils.compilePlugin(opts);
                    this.print("package deps...");
                    await build_1.BuildUtils.packagePluginDependencies(opts);
                    return { error: null };
                }
                case DevCommands.INSTALL_PLUGIN: {
                    const currentVersion = build_1.BuildUtils.getCurrentVersion();
                    await build_1.BuildUtils.installPluginLocally(currentVersion);
                    return { error: null };
                }
                case DevCommands.ENABLE_TELEMETRY: {
                    this.enableTelemetry();
                    return { error: null };
                }
                case DevCommands.DISABLE_TELEMETRY: {
                    this.disableTelemetry();
                    return { error: null };
                }
                case DevCommands.SHOW_TELEMETRY: {
                    __1.CLIAnalyticsUtils.showTelemetryMessage();
                    return { error: null };
                }
                case DevCommands.SHOW_MIGRATIONS: {
                    this.showMigrations();
                    return { error: null };
                }
                case DevCommands.RUN_MIGRATION: {
                    if (!this.validateRunMigrationArgs(opts)) {
                        return {
                            error: new common_all_1.DendronError({
                                message: "missing option(s) for run_migration command",
                            }),
                        };
                    }
                    this.runMigration(opts);
                    return { error: null };
                }
                default:
                    return (0, common_all_1.assertUnreachable)(cmd);
            }
        }
        catch (err) {
            this.L.error(err);
            if (err instanceof common_all_1.DendronError) {
                this.print(["status:", err.status, err.message].join(" "));
            }
            else {
                this.print("unknown error " + (0, common_all_1.stringifyError)(err));
            }
            return { error: err };
        }
    }
    async bumpVersion(opts) {
        this.print("bump version...");
        build_1.LernaUtils.bumpVersion(opts.upgradeType);
    }
    async build(opts) {
        const ctx = "build";
        // get package version
        const currentVersion = build_1.BuildUtils.getCurrentVersion();
        const nextVersion = build_1.BuildUtils.genNextVersion({
            currentVersion,
            upgradeType: opts.upgradeType,
        });
        const shouldPublishLocal = opts.publishEndpoint === build_1.PublishEndpoint.LOCAL;
        this.L.info({ ctx, currentVersion, nextVersion });
        this.print(`prep publish ${opts.publishEndpoint}...`);
        if (shouldPublishLocal) {
            this.print("setting endpoint to local");
            await build_1.BuildUtils.prepPublishLocal();
        }
        else {
            this.print("setting endpoint to remote");
            await build_1.BuildUtils.prepPublishRemote();
        }
        if (!opts.fast) {
            this.print("run type-check...");
            build_1.BuildUtils.runTypeCheck();
        }
        else {
            this.print("skipping type-check...");
        }
        this.bumpVersion(opts);
        this.print("publish version...");
        await build_1.LernaUtils.publishVersion(opts.publishEndpoint);
        this.print("sync assets...");
        await this.syncAssets(opts);
        this.print(`prep repo... extensionType: ${opts.extensionType}`);
        await build_1.BuildUtils.prepPluginPkg(opts.extensionType);
        if (!shouldPublishLocal) {
            this.print("sleeping 2 mins for remote npm registry to have packages ready");
            await common_all_1.TimeUtils.sleep(2 * 60 * 1000);
        }
        else {
            const localSleepSeconds = 15;
            this.print(`sleeping ${localSleepSeconds}s for local npm registry to have packages ready`);
            await common_all_1.TimeUtils.sleep(localSleepSeconds * 1000);
        }
        this.print("install deps...");
        build_1.BuildUtils.installPluginDependencies();
        this.print("compiling plugin...");
        await build_1.BuildUtils.compilePlugin(opts);
        this.print("package deps...");
        await build_1.BuildUtils.packagePluginDependencies(opts);
        this.print("setRegRemote...");
        build_1.BuildUtils.setRegRemote();
        if (!opts.fast) {
            this.print("restore package.json...");
            build_1.BuildUtils.restorePluginPkgJson();
        }
        else {
            this.print("skip restore package.json...");
        }
        this.L.info("done");
    }
    /**
     * Takes assets from different monorepo packages and copies them over to the plugin
     * @param param0
     * @returns
     */
    async syncAssets({ fast }) {
        if (!fast) {
            this.print("build plugin views for prod...");
            build_1.BuildUtils.buildPluginViews();
        }
        this.print("sync static...");
        const { staticPath } = await build_1.BuildUtils.syncStaticAssets();
        await build_1.BuildUtils.syncStaticAssetsToNextjsTemplate();
        return { staticPath };
    }
    syncTutorial() {
        const dendronSiteVaultPath = path_1.default.join(build_1.BuildUtils.getLernaRoot(), "docs", "seeds", "dendron.dendron-site", "vault");
        const tutorialDirPath = path_1.default.join(build_1.BuildUtils.getPluginRootPath(), "assets", "dendron-ws", "tutorial");
        const commonDirPath = path_1.default.join(tutorialDirPath, "common");
        // wipe everything in /assets/dendron-ws/tutorial/treatments
        const treatmentsDirPath = path_1.default.join(tutorialDirPath, "treatments");
        fs_extra_1.default.removeSync(treatmentsDirPath);
        fs_extra_1.default.ensureDirSync(treatmentsDirPath);
        // grab everything from `tutorial.*` hierarchy
        const tutorialNotePaths = fs_extra_1.default
            .readdirSync(dendronSiteVaultPath)
            .filter((basename) => {
            return (basename.startsWith("tutorial.") &&
                basename.endsWith(".md") &&
                basename !== "tutorial.md");
        });
        // determine treatment name
        const treatmentNames = lodash_1.default.uniq(tutorialNotePaths.map((basename) => basename.split(".")[1]));
        treatmentNames.forEach((treatmentName) => {
            // create directories for treatment
            const treatmentNameDirPath = path_1.default.join(treatmentsDirPath, treatmentName);
            fs_extra_1.default.ensureDirSync(treatmentNameDirPath);
            // copy in commons (root, schema, assetdir)
            fs_extra_1.default.copySync(commonDirPath, treatmentNameDirPath);
            // copy in individual treated tutorial notes
            tutorialNotePaths
                .filter((basename) => basename.startsWith(`tutorial.${treatmentName}`))
                .forEach((basename) => {
                const src = path_1.default.join(dendronSiteVaultPath, basename);
                const dest = path_1.default.join(treatmentNameDirPath, basename.replace(`tutorial.${treatmentName}`, "tutorial"));
                fs_extra_1.default.copyFileSync(src, dest);
            });
        });
    }
    validateBuildArgs(opts) {
        if (!opts.upgradeType || !opts.publishEndpoint) {
            return false;
        }
        return true;
    }
    validateBumpVersionArgs(opts) {
        if (!opts.upgradeType) {
            return false;
        }
        return true;
    }
    validateCreateTestVaultArgs(opts) {
        if (!opts.wsRoot || !opts.jsonData) {
            return false;
        }
        return true;
    }
    validatePrepPluginArgs(opts) {
        if (opts.extensionType) {
            return Object.values(build_1.ExtensionType).includes(opts.extensionType);
        }
        return true;
    }
    validateRunMigrationArgs(opts) {
        if (!opts.wsRoot) {
            return false;
        }
        if (opts.migrationVersion) {
            return engine_server_1.MIGRATION_ENTRIES.map((m) => m.version).includes(opts.migrationVersion);
        }
        return true;
    }
    enableTelemetry() {
        const reason = common_server_1.TelemetryStatus.ENABLED_BY_CLI_COMMAND;
        common_server_1.SegmentClient.enable(reason);
        __1.CLIAnalyticsUtils.track(common_all_1.CLIEvents.CLITelemetryEnabled, { reason });
        const message = [
            "Telemetry is enabled.",
            "Thank you for helping us improve Dendron 🌱",
        ].join("\n");
        this.print(message);
    }
    disableTelemetry() {
        const reason = common_server_1.TelemetryStatus.DISABLED_BY_CLI_COMMAND;
        __1.CLIAnalyticsUtils.track(common_all_1.CLIEvents.CLITelemetryDisabled, { reason });
        common_server_1.SegmentClient.disable(reason);
        const message = "Telemetry is disabled.";
        this.print(message);
    }
    showMigrations() {
        const headerMessage = [
            "",
            "Make note of the version number and use it in the run_migration command",
            "",
            "e.g.)",
            "> dendron dev run_migration --migrationVersion=0.64.1",
            "",
        ].join("\n");
        const body = [];
        let maxLength = 0;
        engine_server_1.MIGRATION_ENTRIES.forEach((migrations) => {
            const version = migrations.version.padEnd(17);
            const changes = migrations.changes.map((set) => set.name).join(", ");
            const line = `${version}| ${changes}`;
            if (maxLength < line.length)
                maxLength = line.length;
            body.push(line);
        });
        const divider = "-".repeat(maxLength);
        this.print("======Available Migrations======");
        this.print(headerMessage);
        this.print(divider);
        this.print("version          | description");
        this.print(divider);
        this.print(body.join("\n"));
        this.print(divider);
    }
    async runMigration(opts) {
        // grab the migration we want to run
        const migrationsToRun = engine_server_1.MIGRATION_ENTRIES.filter((m) => m.version === opts.migrationVersion);
        // run it
        const currentVersion = migrationsToRun[0].version;
        const wsService = new engine_server_1.WorkspaceService({ wsRoot: opts.wsRoot });
        const configPath = common_server_1.DConfig.configPath(opts.wsRoot);
        const dendronConfig = (0, common_server_1.readYAML)(configPath);
        const wsConfig = wsService.getCodeWorkspaceSettingsSync();
        if (lodash_1.default.isUndefined(wsConfig)) {
            throw common_all_1.DendronError.createFromStatus({
                status: common_all_1.ERROR_STATUS.INVALID_STATE,
                message: "no workspace config found",
            });
        }
        const changes = await engine_server_1.MigrationService.applyMigrationRules({
            currentVersion,
            previousVersion: "0.0.0",
            migrations: migrationsToRun,
            wsService,
            logger: this.L,
            wsConfig,
            dendronConfig,
        });
        // report
        if (changes.length > 0) {
            changes.forEach((change) => {
                const event = lodash_1.default.isUndefined(change.error)
                    ? common_all_1.CLIEvents.CLIMigrationSucceeded
                    : common_all_1.CLIEvents.CLIMigrationFailed;
                __1.CLIAnalyticsUtils.track(event, engine_server_1.MigrationUtils.getMigrationAnalyticProps(change));
                if (change.error) {
                    this.print("Migration failed.");
                    this.print(change.error.message);
                }
                else {
                    this.print("Migration succeeded.");
                }
            });
        }
    }
}
exports.DevCLICommand = DevCLICommand;
//# sourceMappingURL=devCLICommand.js.map