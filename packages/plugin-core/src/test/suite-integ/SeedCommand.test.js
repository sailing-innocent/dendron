"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_server_1 = require("@dendronhq/common-server");
const engine_server_1 = require("@dendronhq/engine-server");
const engine_test_utils_1 = require("@dendronhq/engine-test-utils");
const constants_1 = require("../../constants");
const testUtilsv2_1 = require("../testUtilsv2");
const testUtilsV3_1 = require("../testUtilsV3");
const TestSeedUtils_1 = require("../utils/TestSeedUtils");
suite(constants_1.DENDRON_COMMANDS.SEED_ADD.key, function seedAddTests() {
    const ctx = (0, testUtilsV3_1.setupBeforeAfter)(this, {});
    test("ok: add seed", (done) => {
        (0, testUtilsV3_1.runLegacyMultiWorkspaceTest)({
            ctx,
            onInit: async ({ engine, wsRoot }) => {
                var _a, _b, _c;
                const tmp = (0, common_server_1.tmpDir)().name;
                const { registryFile } = await engine_test_utils_1.TestSeedUtils.createSeedRegistry({
                    engine,
                    wsRoot: tmp,
                });
                const id = engine_test_utils_1.TestSeedUtils.defaultSeedId();
                const seedService = new engine_server_1.SeedService({ wsRoot, registryFile });
                const { cmd, fakedOnUpdating, fakedOnUpdated } = TestSeedUtils_1.PluginTestSeedUtils.getFakedAddCommand(seedService);
                const resp = await cmd.execute({ seedId: id });
                (0, testUtilsv2_1.expect)(resp.error).toBeFalsy();
                (0, testUtilsv2_1.expect)((_a = resp.data) === null || _a === void 0 ? void 0 : _a.seed.name).toEqual("foo");
                (0, testUtilsv2_1.expect)((_c = (_b = resp.data) === null || _b === void 0 ? void 0 : _b.seedPath) === null || _c === void 0 ? void 0 : _c.includes("dendron.foo")).toBeTruthy();
                (0, testUtilsv2_1.expect)(fakedOnUpdating.callCount).toEqual(1);
                (0, testUtilsv2_1.expect)(fakedOnUpdated.callCount).toEqual(1);
                done();
            },
        });
    });
    test("error: try to add duplicate seed", (done) => {
        (0, testUtilsV3_1.runLegacyMultiWorkspaceTest)({
            ctx,
            onInit: async ({ engine, wsRoot }) => {
                const tmp = (0, common_server_1.tmpDir)().name;
                const { registryFile } = await engine_test_utils_1.TestSeedUtils.createSeedRegistry({
                    engine,
                    wsRoot: tmp,
                });
                const id = engine_test_utils_1.TestSeedUtils.defaultSeedId();
                const seedService = new engine_server_1.SeedService({ wsRoot, registryFile });
                await seedService.addSeed({ id });
                const { cmd, fakedOnUpdating, fakedOnUpdated } = TestSeedUtils_1.PluginTestSeedUtils.getFakedAddCommand(seedService);
                const resp = await cmd.execute({ seedId: id });
                (0, testUtilsv2_1.expect)(resp.error).toBeTruthy();
                (0, testUtilsv2_1.expect)(fakedOnUpdating.callCount).toEqual(0);
                (0, testUtilsv2_1.expect)(fakedOnUpdated.callCount).toEqual(0);
                done();
            },
        });
    });
});
suite(constants_1.DENDRON_COMMANDS.SEED_REMOVE.key, function seedRemoveTests() {
    const ctx = (0, testUtilsV3_1.setupBeforeAfter)(this, {});
    test("ok: remove seed", (done) => {
        (0, testUtilsV3_1.runLegacyMultiWorkspaceTest)({
            ctx,
            onInit: async ({ engine, wsRoot }) => {
                const tmp = (0, common_server_1.tmpDir)().name;
                const { registryFile } = await engine_test_utils_1.TestSeedUtils.createSeedRegistry({
                    engine,
                    wsRoot: tmp,
                });
                const id = engine_test_utils_1.TestSeedUtils.defaultSeedId();
                const seedService = new engine_server_1.SeedService({ wsRoot, registryFile });
                await seedService.addSeed({ id });
                const { cmd, fakedOnUpdating, fakedOnUpdated } = TestSeedUtils_1.PluginTestSeedUtils.getFakedRemoveCommand(seedService);
                const resp = await cmd.execute({ seedId: id });
                (0, testUtilsv2_1.expect)(resp.error).toBeFalsy();
                (0, testUtilsv2_1.expect)(fakedOnUpdating.callCount).toEqual(1);
                (0, testUtilsv2_1.expect)(fakedOnUpdated.callCount).toEqual(1);
                done();
            },
        });
    });
    test("error: remove non-existent seed", (done) => {
        (0, testUtilsV3_1.runLegacyMultiWorkspaceTest)({
            ctx,
            onInit: async ({ engine, wsRoot }) => {
                const tmp = (0, common_server_1.tmpDir)().name;
                const { registryFile } = await engine_test_utils_1.TestSeedUtils.createSeedRegistry({
                    engine,
                    wsRoot: tmp,
                });
                const id = engine_test_utils_1.TestSeedUtils.defaultSeedId();
                const seedService = new engine_server_1.SeedService({ wsRoot, registryFile });
                const { cmd, fakedOnUpdating, fakedOnUpdated } = TestSeedUtils_1.PluginTestSeedUtils.getFakedRemoveCommand(seedService);
                const resp = await cmd.execute({ seedId: id });
                (0, testUtilsv2_1.expect)(resp.error).toBeTruthy();
                (0, testUtilsv2_1.expect)(resp.data).toBeFalsy();
                (0, testUtilsv2_1.expect)(fakedOnUpdating.callCount).toEqual(0);
                (0, testUtilsv2_1.expect)(fakedOnUpdated.callCount).toEqual(0);
                done();
            },
        });
    });
});
//# sourceMappingURL=SeedCommand.test.js.map