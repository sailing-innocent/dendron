"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeedRegistry = void 0;
const common_all_1 = require("@dendronhq/common-all");
const common_server_1 = require("@dendronhq/common-server");
class SeedRegistry {
    static create(opts) {
        let registry = common_all_1.SEED_REGISTRY;
        if (opts === null || opts === void 0 ? void 0 : opts.registryFile) {
            registry = (0, common_server_1.readYAML)(opts.registryFile);
        }
        return new SeedRegistry(registry);
    }
    constructor(registry) {
        this.registry = registry;
    }
    info({ id }) {
        return this.registry[id];
    }
}
exports.SeedRegistry = SeedRegistry;
//# sourceMappingURL=registry.js.map