"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VaultCLICommand = exports.VaultCommands = void 0;
const engine_server_1 = require("@dendronhq/engine-server");
const common_all_1 = require("@dendronhq/common-all");
const base_1 = require("./base");
const utils_1 = require("./utils");
const common_server_1 = require("@dendronhq/common-server");
var VaultCommands;
(function (VaultCommands) {
    VaultCommands["CREATE"] = "create";
    VaultCommands["CONVERT"] = "convert";
})(VaultCommands = exports.VaultCommands || (exports.VaultCommands = {}));
class VaultCLICommand extends base_1.CLICommand {
    constructor() {
        super({ name: "vault <cmd>", desc: "vault related commands" });
    }
    buildArgs(args) {
        super.buildArgs(args);
        (0, utils_1.setupEngineArgs)(args);
        args.positional("cmd", {
            describe: "a command to run",
            choices: Object.values(VaultCommands),
            type: "string",
        });
        args.option("vaultPath", {
            describe: "path to vault",
            type: "string",
            required: true,
        });
        args.option("noAddToConfig", {
            describe: "if set, don't add vault to dendron.yml",
            type: "boolean",
        });
        args.option("remoteUrl", {
            describe: "If converting to a remote vault, URL of the remote to use. Like https://github.com/dendronhq/dendron-site.git or git@github.com:dendronhq/dendron-site.git",
            type: "string",
        });
        args.option("type", {
            describe: "If converting a vault, what type of vault to convert it to.",
            type: "string",
            choices: ["remote", "local"],
        });
    }
    async enrichArgs(args) {
        this.addArgsToPayload({ cmd: args.cmd });
        const engineArgs = await (0, utils_1.setupEngine)(args);
        return { data: { ...args, ...engineArgs } };
    }
    async execute(opts) {
        var _a;
        const { cmd, wsRoot, vaultPath, noAddToConfig } = opts;
        try {
            switch (cmd) {
                case VaultCommands.CREATE: {
                    //const vault = checkAndCleanVault({ vaultName: opts.vault, engine });
                    const wsService = new engine_server_1.WorkspaceService({ wsRoot });
                    let resp;
                    if ((_a = common_server_1.DConfig.readConfigSync(wsRoot).dev) === null || _a === void 0 ? void 0 : _a.enableSelfContainedVaults) {
                        const vault = {
                            fsPath: vaultPath,
                            selfContained: true,
                        };
                        resp = await wsService.createSelfContainedVault({
                            vault,
                            addToConfig: true,
                            addToCodeWorkspace: true,
                            newVault: true,
                        });
                    }
                    else {
                        const vault = {
                            fsPath: vaultPath,
                        };
                        resp = await wsService.createVault({
                            vault,
                            noAddToConfig,
                            addToCodeWorkspace: true,
                        });
                    }
                    this.print(`${vaultPath} created`);
                    return { vault: resp, error: undefined };
                }
                case VaultCommands.CONVERT: {
                    // Find the full vault object because convert commands will need it to correctly edit `dendron.yml`
                    const vault = opts.engine.vaults.find((vault) => vault.fsPath === vaultPath);
                    if (!vault)
                        throw new common_all_1.DendronError({
                            message: `Could not find any vaults at ${vaultPath}`,
                        });
                    const wsService = new engine_server_1.WorkspaceService({ wsRoot });
                    if (opts.type === "local") {
                        wsService.convertVaultLocal({ wsRoot, vault });
                    }
                    else if (opts.type === "remote") {
                        const { remoteUrl } = opts;
                        if (!remoteUrl)
                            throw new common_all_1.DendronError({
                                message: "Trying to convert to a remote vault, but the ",
                            });
                        wsService.convertVaultRemote({ wsRoot, vault, remoteUrl });
                    }
                    else {
                        throw new common_all_1.DendronError({
                            message: `Please provide what type of vault should be created.`,
                        });
                    }
                    return { vault, error: undefined };
                }
                default: {
                    throw Error("bad option");
                }
            }
        }
        finally {
            if (opts.server.close) {
                opts.server.close();
            }
        }
    }
}
exports.VaultCLICommand = VaultCLICommand;
//# sourceMappingURL=vaultCLICommand.js.map