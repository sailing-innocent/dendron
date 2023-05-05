"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateInitializer = void 0;
const blankInitializer_1 = require("./blankInitializer");
/**
 * Template Workspace Initializer - add the templates seed to the workspace:
 */
class TemplateInitializer extends blankInitializer_1.BlankInitializer {
    async onWorkspaceCreation(opts) {
        var _a;
        await super.onWorkspaceCreation(opts);
        await ((_a = opts.svc) === null || _a === void 0 ? void 0 : _a.seedService.addSeed({
            id: "dendron.templates",
        }));
        return;
    }
}
exports.TemplateInitializer = TemplateInitializer;
//# sourceMappingURL=templateInitializer.js.map