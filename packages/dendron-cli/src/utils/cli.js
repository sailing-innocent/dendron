"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpinnerUtils = exports.CLIUtils = void 0;
const lodash_1 = __importDefault(require("lodash"));
const common_all_1 = require("@dendronhq/common-all");
class CLIUtils {
    static getClientVersion() {
        // eslint-disable-next-line global-require
        const pkgJSON = require("@dendronhq/dendron-cli/package.json");
        return pkgJSON.version;
    }
}
/**
 * Takes an object like
 *     {
 *     		foo: "42",
 *     		bar: 10
 *     }
 * and returns "foo=42,bar=10"
 * @param ent: config object
 * @returns
 */
CLIUtils.objectConfig2StringConfig = (ent) => {
    return lodash_1.default.map(ent, (v, k) => {
        if (lodash_1.default.isUndefined(v)) {
            return undefined;
        }
        else {
            return `${k}=${v}`;
        }
    }).filter((ent) => !lodash_1.default.isUndefined(ent)).join(",");
};
exports.CLIUtils = CLIUtils;
class SpinnerUtils {
    /**
     * Given a Ora spinner, render given text with optional symbol
     * Continue spinning.
     * @param opts
     */
    static renderAndContinue(opts) {
        const { spinner, text, symbol } = opts;
        spinner.stopAndPersist({
            text: text || undefined,
            symbol: symbol || common_all_1.DENDRON_EMOJIS.SEEDLING,
        });
        spinner.start();
    }
}
exports.SpinnerUtils = SpinnerUtils;
//# sourceMappingURL=cli.js.map