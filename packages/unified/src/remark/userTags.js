"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.userTags = exports.UserTagUtils = exports.USERTAG_REGEX_LOOSE = exports.USERTAG_REGEX = void 0;
const common_all_1 = require("@dendronhq/common-all");
const SiteUtils_1 = require("../SiteUtils");
const types_1 = require("../types");
const utilsv5_1 = require("../utilsv5");
const hashtag_1 = require("./hashtag");
/** Can have period in the middle */
const GOOD_MIDDLE_CHARACTER = `[^#@|\\[\\]\\s${hashtag_1.PUNCTUATION_MARKS}]`;
/** Can have period in the end */
const GOOD_END_CHARACTER = `[^#@|\\[\\]\\s${hashtag_1.PUNCTUATION_MARKS}]`;
/** User tags have the form @Lovelace, or @Hamilton.Margaret, or @7of9.
 *
 * User tags are also not allowed to contain any punctuation or quotation marks, and will not include a trailing dot
 * This allows them to be more easily mixed into text, for example:
 *
 * ```
 * Please contact @Ben.Barres.
 * ```
 *
 * Here, the tag is `#important` without the following comma.
 */
exports.USERTAG_REGEX = new RegExp(
// Avoid matching it if there's a non-whitespace character before (like foo@example.com)
`^(?<!\\S)(?<tagSymbol>@)(?<tagContents>` +
    `${GOOD_MIDDLE_CHARACTER}*` +
    `${GOOD_END_CHARACTER}` +
    `)`);
/** Same as `USERTAG_REGEX`, except that that it doesn't have to be at the start of the string. */
exports.USERTAG_REGEX_LOOSE = new RegExp(
// Avoid matching it if there's a non-whitespace character before (like foo@example.com)
`(?<!\\S)(?<userTag>@)(?<userTagContents>` +
    `${GOOD_MIDDLE_CHARACTER}*` +
    `${GOOD_END_CHARACTER}` +
    `)`);
class UserTagUtils {
    static extractTagFromMatch(match) {
        if (match && match.groups) {
            return match.groups.tagContents || match.groups.userTagContents;
        }
        return;
    }
}
_a = UserTagUtils;
/**
 *
 * @param text The text to check if it matches an hashtag.
 * @param matchLoose If true, a hashtag anywhere in the string will match. Otherwise the string must contain only the anchor.
 * @returns The identifier for the matched hashtag, or undefined if it did not match.
 */
UserTagUtils.matchUserTag = (text, matchLoose = true) => {
    const match = (matchLoose ? exports.USERTAG_REGEX : exports.USERTAG_REGEX_LOOSE).exec(text);
    return _a.extractTagFromMatch(match);
};
exports.UserTagUtils = UserTagUtils;
const plugin = function plugin(opts) {
    attachParser(this);
    if (this.Compiler != null) {
        attachCompiler(this, opts);
    }
};
exports.userTags = plugin;
function attachParser(proc) {
    function locator(value, fromIndex) {
        // Do not locate a symbol if the previous character is non-whitespace.
        // Unified cals tokenizer starting at the index we return here,
        // so tokenizer won't be able to reject it for not starting with a non-space character.
        const atSymbol = value.indexOf("@", fromIndex);
        if (atSymbol === 0) {
            return atSymbol;
        }
        else if (atSymbol > 0) {
            const previousSymbol = value[atSymbol - 1];
            if (!previousSymbol || /[\s]/.exec(previousSymbol)) {
                return atSymbol;
            }
        }
        return -1;
    }
    function inlineTokenizer(eat, value) {
        var _b;
        const { enableUserTags } = common_all_1.ConfigUtils.getWorkspace(utilsv5_1.MDUtilsV5.getProcData(proc).config);
        if (enableUserTags === false)
            return;
        const match = exports.USERTAG_REGEX.exec(value);
        if (match && ((_b = match.groups) === null || _b === void 0 ? void 0 : _b.tagContents)) {
            return eat(match[0])({
                type: types_1.DendronASTTypes.USERTAG,
                // @ts-ignore
                value: match[0],
                fname: `${common_all_1.USERS_HIERARCHY}${match.groups.tagContents}`,
            });
        }
        return;
    }
    inlineTokenizer.locator = locator;
    const Parser = proc.Parser;
    const inlineTokenizers = Parser.prototype.inlineTokenizers;
    const inlineMethods = Parser.prototype.inlineMethods;
    inlineTokenizers.users = inlineTokenizer;
    inlineMethods.splice(inlineMethods.indexOf("link"), 0, "users");
}
function attachCompiler(proc, _opts) {
    const Compiler = proc.Compiler;
    const visitors = Compiler.prototype.visitors;
    if (visitors) {
        visitors.usertag = (node) => {
            const { dest, config } = utilsv5_1.MDUtilsV5.getProcData(proc);
            const prefix = SiteUtils_1.SiteUtils.getSitePrefixForNote(config);
            switch (dest) {
                case types_1.DendronASTDest.MD_DENDRON:
                    return node.value;
                case types_1.DendronASTDest.MD_REGULAR:
                case types_1.DendronASTDest.MD_ENHANCED_PREVIEW:
                    return `[${node.value}](${prefix}${node.fname})`;
                default:
                    throw new common_all_1.DendronError({ message: "Unable to render user tag" });
            }
        };
    }
}
//# sourceMappingURL=userTags.js.map