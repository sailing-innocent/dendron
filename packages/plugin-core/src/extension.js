"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const logger_1 = require("./logger");
const workspacev2_1 = require("./workspacev2");
function activate(context) {
    logger_1.Logger.configure(context, "debug");
    require("./_extension").activate(context); // eslint-disable-line global-require
    return {
        DWorkspace: workspacev2_1.DWorkspace,
        Logger: logger_1.Logger,
    };
}
exports.activate = activate;
function deactivate() {
    require("./_extension").deactivate(); // eslint-disable-line global-require
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map