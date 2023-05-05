"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MIGRATION_ENTRIES = exports.CONFIG_MIGRATIONS = void 0;
const common_all_1 = require("@dendronhq/common-all");
const lodash_1 = __importDefault(require("lodash"));
const utils_1 = require("./utils");
const _1 = require(".");
const common_server_1 = require("@dendronhq/common-server");
exports.CONFIG_MIGRATIONS = {
    version: "0.83.0",
    changes: [
        {
            /**
             * This is the migration that was done to clean up all legacy config namespaces.
             */
            name: "migrate config",
            func: async ({ dendronConfig, wsConfig, wsService }) => {
                try {
                    await common_server_1.DConfig.createBackup(wsService.wsRoot, "migrate-configs");
                }
                catch (error) {
                    return {
                        data: {
                            dendronConfig,
                            wsConfig,
                        },
                        error: new common_all_1.DendronError({
                            message: "Backup failed during config migration. Exiting without migration.",
                        }),
                    };
                }
                const defaultV5Config = common_all_1.ConfigUtils.genDefaultConfig();
                const rawDendronConfig = common_server_1.DConfig.getRaw(wsService.wsRoot);
                // remove all null properties
                const cleanDendronConfig = utils_1.MigrationUtils.deepCleanObjBy(rawDendronConfig, lodash_1.default.isNull);
                if (lodash_1.default.isUndefined(cleanDendronConfig.commands)) {
                    cleanDendronConfig.commands = {};
                }
                if (lodash_1.default.isUndefined(cleanDendronConfig.workspace)) {
                    cleanDendronConfig.workspace = {};
                }
                if (lodash_1.default.isUndefined(cleanDendronConfig.preview)) {
                    cleanDendronConfig.preview = {};
                }
                if (lodash_1.default.isUndefined(cleanDendronConfig.publishing)) {
                    cleanDendronConfig.publishing = {};
                }
                // legacy paths to remove from config;
                const legacyPaths = [];
                // migrate each path mapped in current config version
                utils_1.PATH_MAP.forEach((value, key) => {
                    const { target: legacyPath, preserve } = value;
                    let iteratee = value.iteratee;
                    let valueToFill;
                    let alreadyFilled;
                    if (iteratee !== "skip") {
                        alreadyFilled = lodash_1.default.has(cleanDendronConfig, key);
                        const maybeLegacyConfig = lodash_1.default.get(cleanDendronConfig, legacyPath);
                        if (lodash_1.default.isUndefined(maybeLegacyConfig)) {
                            // legacy property doesn't have a value.
                            valueToFill = lodash_1.default.get(defaultV5Config, key);
                        }
                        else {
                            // there is a legacy value.
                            // check if this mapping needs special treatment.
                            if (lodash_1.default.isUndefined(iteratee)) {
                                // assume identity mapping.
                                iteratee = lodash_1.default.identity;
                            }
                            valueToFill = iteratee(maybeLegacyConfig);
                        }
                    }
                    if (!alreadyFilled && !lodash_1.default.isUndefined(valueToFill)) {
                        // if the property isn't already filled, fill it with determined value.
                        lodash_1.default.set(cleanDendronConfig, key, valueToFill);
                    }
                    // these will later be used to delete.
                    // only push if we aren't preserving target.
                    if (!preserve) {
                        legacyPaths.push(legacyPath);
                    }
                });
                // set config version.
                lodash_1.default.set(cleanDendronConfig, "version", 5);
                // add deprecated paths to legacyPaths
                // so they could be unset if they exist
                legacyPaths.push(..._1.DEPRECATED_PATHS);
                // remove legacy property from config after migration.
                legacyPaths.forEach((legacyPath) => {
                    lodash_1.default.unset(cleanDendronConfig, legacyPath);
                });
                // recursively populate missing defaults
                const migratedConfig = lodash_1.default.defaultsDeep(cleanDendronConfig, defaultV5Config);
                return { data: { dendronConfig: migratedConfig, wsConfig } };
            },
        },
    ],
};
exports.MIGRATION_ENTRIES = [exports.CONFIG_MIGRATIONS];
//# sourceMappingURL=migrations.js.map