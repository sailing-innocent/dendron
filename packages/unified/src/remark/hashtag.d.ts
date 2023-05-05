import { Plugin } from "unified";
/** All sorts of punctuation marks and quotation marks from different languages. Please add any that may be missing.
 *
 * Be warned that this excludes period (.) as it has a special meaning in Dendron. Make sure to handle it appropriately depending on the context.
 *
 * Mind that this may have non regex-safe characters, run it through `_.escapeRegExp` if needed.
 */
export declare const PUNCTUATION_MARKS = ",;:'\"<>()?!`~\u00AB\u2039\u00BB\u203A\u201E\u201C\u201F\u201D\u2019\u275D\u275E\u276E\u276F\u2E42\u301D\u301E\u301F\uFF02\u201A\u2018\u201B\u275B\u275C\u275F\uFF3B\uFF3D\u3010\u3011\u2026\u2025\u300C\u300D\u300E\u300F\u00B7\u061F\u060C\u0964\u0965\u203D\u2E18\u00A1\u00BF\u2048\u2049";
/** Hashtags have the form #foo, or #foo.bar, or #f123
 *
 * Hashtags are not allowed to start with numbers: this is to reserve them in
 * case we want to add Github issues integration, where issues look like #123
 *
 * Hashtags are also not allowed to contain any punctuation or quotation marks.
 * This allows them to be more easily mixed into text, for example:
 *
 * ```
 * This issue is #important, and should be prioritized.
 * ```
 *
 * Here, the tag is `#important` without the following comma.
 */
export declare const HASHTAG_REGEX: RegExp;
/** Same as `HASHTAG_REGEX`, except that that it doesn't have to be at the start of the string. */
export declare const HASHTAG_REGEX_LOOSE: RegExp;
/** Used for `getWordAtRange` queries. Too permissive, but the full regex breaks the function. */
export declare const HASHTAG_REGEX_BASIC: RegExp;
export declare class HashTagUtils {
    static extractTagFromMatch(match: RegExpMatchArray | null): string | undefined;
    /**
     *
     * @param text The text to check if it matches an hashtag.
     * @param matchLoose If true, a hashtag anywhere in the string will match. Otherwise the string must contain only the anchor.
     * @returns The identifier for the matched hashtag, or undefined if it did not match.
     */
    static matchHashtag: (text: string, matchLoose?: boolean) => string | undefined;
}
type PluginOpts = {};
declare const plugin: Plugin<[PluginOpts?]>;
export { plugin as hashtags };
export { PluginOpts as HashTagOpts };
