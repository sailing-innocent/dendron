import { Plugin } from "unified";
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
export declare const USERTAG_REGEX: RegExp;
/** Same as `USERTAG_REGEX`, except that that it doesn't have to be at the start of the string. */
export declare const USERTAG_REGEX_LOOSE: RegExp;
export declare class UserTagUtils {
    static extractTagFromMatch(match: RegExpMatchArray | null): string | undefined;
    /**
     *
     * @param text The text to check if it matches an hashtag.
     * @param matchLoose If true, a hashtag anywhere in the string will match. Otherwise the string must contain only the anchor.
     * @returns The identifier for the matched hashtag, or undefined if it did not match.
     */
    static matchUserTag: (text: string, matchLoose?: boolean) => string | undefined;
}
type PluginOpts = {};
declare const plugin: Plugin<[PluginOpts?]>;
export { plugin as userTags };
export { PluginOpts as UserTagOpts };
