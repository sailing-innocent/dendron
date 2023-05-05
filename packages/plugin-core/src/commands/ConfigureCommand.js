"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigureCommand = void 0;
const common_server_1 = require("@dendronhq/common-server");
const vscode_1 = require("vscode");
const constants_1 = require("../constants");
const vsCodeUtils_1 = require("../vsCodeUtils");
const base_1 = require("./base");
class ConfigureCommand extends base_1.BasicCommand {
    constructor(extension) {
        super();
        this.key = constants_1.DENDRON_COMMANDS.CONFIGURE_RAW.key;
        this._ext = extension;
    }
    async gatherInputs() {
        return {};
    }
    async execute() {
        const dendronRoot = this._ext.getDWorkspace().wsRoot;
        const configPath = common_server_1.DConfig.configPath(dendronRoot);
        const uri = vscode_1.Uri.file(configPath);
        await vsCodeUtils_1.VSCodeUtils.openFileInEditor(uri);
        return;
    }
}
ConfigureCommand.requireActiveWorkspace = true;
exports.ConfigureCommand = ConfigureCommand;
//# sourceMappingURL=ConfigureCommand.js.map