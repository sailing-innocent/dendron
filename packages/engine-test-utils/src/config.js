"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestConfigUtils = void 0;
const common_server_1 = require("@dendronhq/common-server");
class TestConfigUtils {
}
TestConfigUtils.getConfig = (opts) => {
    const configPath = common_server_1.DConfig.configPath(opts.wsRoot);
    const config = (0, common_server_1.readYAML)(configPath);
    return config;
};
TestConfigUtils.withConfig = (func, opts) => {
    const config = TestConfigUtils.getConfig(opts);
    const newConfig = func(config);
    TestConfigUtils.writeConfig({ config: newConfig, wsRoot: opts.wsRoot });
    return newConfig;
};
TestConfigUtils.writeConfig = (opts) => {
    const configPath = common_server_1.DConfig.configPath(opts.wsRoot);
    return (0, common_server_1.writeYAML)(configPath, opts.config);
};
exports.TestConfigUtils = TestConfigUtils;
//# sourceMappingURL=config.js.map