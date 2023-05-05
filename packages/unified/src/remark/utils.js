"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemarkUtils = exports.AnchorUtils = exports.LinkUtils = exports.frontmatterTag2WikiLinkNoteV4 = exports.userTag2WikiLinkNoteV4 = exports.hashTag2WikiLinkNoteV4 = exports.getNoteOrError = exports.addError = exports.ALIAS_NAME = exports.LINK_NAME = exports.LINK_CONTENTS = exports.visit = exports.mdastBuilder = exports.selectAll = exports.select = void 0;
const common_all_1 = require("@dendronhq/common-all");
Object.defineProperty(exports, "ALIAS_NAME", { enumerable: true, get: function () { return common_all_1.ALIAS_NAME; } });
Object.defineProperty(exports, "LINK_CONTENTS", { enumerable: true, get: function () { return common_all_1.LINK_CONTENTS; } });
Object.defineProperty(exports, "LINK_NAME", { enumerable: true, get: function () { return common_all_1.LINK_NAME; } });
const lodash_1 = __importDefault(require("lodash"));
const mdastBuilder = __importStar(require("mdast-builder"));
exports.mdastBuilder = mdastBuilder;
const unist_util_select_1 = require("unist-util-select");
const unist_util_visit_1 = __importDefault(require("unist-util-visit"));
exports.visit = unist_util_visit_1.default;
const SiteUtils_1 = require("../SiteUtils");
const types_1 = require("../types");
const utilsv5_1 = require("../utilsv5");
const yaml_1 = require("../yaml");
const toString = require("mdast-util-to-string");
var unist_util_select_2 = require("unist-util-select");
Object.defineProperty(exports, "select", { enumerable: true, get: function () { return unist_util_select_2.select; } });
Object.defineProperty(exports, "selectAll", { enumerable: true, get: function () { return unist_util_select_2.selectAll; } });
function addError(proc, err) {
    const errors = proc.data("errors");
    errors.push(err);
    // no need to put errors back into proc, it's a mutable array
}
exports.addError = addError;
function getNoteOrError(notes, hint) {
    let error;
    let note;
    if (lodash_1.default.isUndefined(notes)) {
        error = new common_all_1.DendronError({ message: `no note found. ${hint}` });
        return { error, note };
    }
    if (notes.length > 1) {
        error = new common_all_1.DendronError({
            message: `multiple notes found for link: ${hint}`,
        });
        return { error, note };
    }
    if (notes.length < 1) {
        error = new common_all_1.DendronError({
            message: `no notes found for link: ${JSON.stringify(hint)}`,
        });
        return { error, note };
    }
    note = notes[0];
    return { error, note };
}
exports.getNoteOrError = getNoteOrError;
function hashTag2WikiLinkNoteV4(hashtag) {
    return {
        ...hashtag,
        type: types_1.DendronASTTypes.WIKI_LINK,
        value: hashtag.fname,
        data: {
            alias: hashtag.value,
        },
    };
}
exports.hashTag2WikiLinkNoteV4 = hashTag2WikiLinkNoteV4;
function userTag2WikiLinkNoteV4(userTag) {
    return {
        ...userTag,
        type: types_1.DendronASTTypes.WIKI_LINK,
        value: userTag.fname,
        data: {
            alias: userTag.value,
        },
    };
}
exports.userTag2WikiLinkNoteV4 = userTag2WikiLinkNoteV4;
function frontmatterTag2WikiLinkNoteV4(tag, useHashSymbol) {
    return {
        type: types_1.DendronASTTypes.WIKI_LINK,
        value: `${common_all_1.TAGS_HIERARCHY}${tag}`,
        data: {
            alias: useHashSymbol ? `#${tag}` : tag,
        },
    };
}
exports.frontmatterTag2WikiLinkNoteV4 = frontmatterTag2WikiLinkNoteV4;
const getLinks = ({ ast, note, filter, }) => {
    const wikiLinks = [];
    const noteRefs = [];
    (0, unist_util_visit_1.default)(ast, (node) => {
        switch (node.type) {
            case types_1.DendronASTTypes.WIKI_LINK:
                wikiLinks.push(node);
                break;
            case types_1.DendronASTTypes.REF_LINK_V2:
                noteRefs.push(node);
                break;
            case types_1.DendronASTTypes.HASHTAG: {
                wikiLinks.push(hashTag2WikiLinkNoteV4(node));
                break;
            }
            case types_1.DendronASTTypes.USERTAG: {
                wikiLinks.push(userTag2WikiLinkNoteV4(node));
                break;
            }
            default:
            /* nothing */
        }
    });
    const dlinks = [];
    if (!lodash_1.default.isNil(note.tags)) {
        let tags;
        if (lodash_1.default.isString(note.tags)) {
            tags = [note.tags];
        }
        else {
            tags = note.tags;
        }
        for (const tag of tags) {
            dlinks.push({
                type: "frontmatterTag",
                from: common_all_1.NoteUtils.toNoteLoc(note),
                value: `${common_all_1.TAGS_HIERARCHY}${tag}`,
                alias: tag,
                xvault: false,
                position: undefined,
                to: {
                    fname: `${common_all_1.TAGS_HIERARCHY}${tag}`,
                },
            });
        }
    }
    for (const wikiLink of wikiLinks) {
        dlinks.push({
            type: LinkUtils.astType2DLinkType(wikiLink.type),
            from: common_all_1.NoteUtils.toNoteLoc(note),
            value: wikiLink.value,
            alias: wikiLink.data.alias,
            position: wikiLink.position,
            xvault: !lodash_1.default.isUndefined(wikiLink.data.vaultName),
            sameFile: wikiLink.data.sameFile,
            // TODO: error if vault not found
            to: {
                fname: wikiLink.value,
                anchorHeader: wikiLink.data.anchorHeader,
                vaultName: wikiLink.data.vaultName,
            },
        });
    }
    // the cast is safe because the only difference is whether `data.vaultName` exists, which is already optional
    for (const noteRef of noteRefs) {
        const { anchorStart, anchorEnd, anchorStartOffset } = noteRef.data.link.data;
        const anchorStartText = anchorStart || "";
        const anchorStartOffsetText = anchorStartOffset
            ? `,${anchorStartOffset}`
            : "";
        const anchorEndText = anchorEnd ? `:#${anchorEnd}` : "";
        const anchorHeader = `${anchorStartText}${anchorStartOffsetText}${anchorEndText}`;
        dlinks.push({
            type: LinkUtils.astType2DLinkType(noteRef.type),
            from: common_all_1.NoteUtils.toNoteLoc(note),
            value: noteRef.data.link.from.fname,
            // not sure why typescript doesn't recognize the position, but I can confirm it exists
            position: noteRef.position,
            xvault: !lodash_1.default.isUndefined(noteRef.data.link.data.vaultName),
            // TODO: error if vault not found
            to: {
                fname: noteRef.data.link.from.fname,
                anchorHeader: anchorHeader || undefined,
                vaultName: noteRef.data.link.data.vaultName,
            },
        });
    }
    if (filter === null || filter === void 0 ? void 0 : filter.loc) {
        // TODO: add additional filters besides fname
        return dlinks.filter((ent) => {
            var _a, _b;
            return ent.value.toLowerCase() === ((_b = (_a = filter === null || filter === void 0 ? void 0 : filter.loc) === null || _a === void 0 ? void 0 : _a.fname) === null || _b === void 0 ? void 0 : _b.toLowerCase());
        });
    }
    // const { logger, dispose } = createDisposableLogger("LinkUtils.getLinks");
    // logger.info({
    //   ctx: "getLinks",
    //   dlinksLength: dlinks.length,
    //   noteRefsLength: noteRefs.length,
    //   wikiLinksLength: wikiLinks.length,
    //   filterLocFname: filter?.loc?.fname,
    // });
    // dispose();
    return dlinks;
};
const getLinkCandidates = async ({ ast, note, engine, }) => {
    const textNodes = [];
    (0, unist_util_visit_1.default)(ast, [types_1.DendronASTTypes.TEXT], (node, _index, parent) => {
        if ((parent === null || parent === void 0 ? void 0 : parent.type) === "paragraph" || (parent === null || parent === void 0 ? void 0 : parent.type) === "tableCell") {
            textNodes.push(node);
        }
    });
    const linkCandidates = [];
    await Promise.all(lodash_1.default.map(textNodes, async (textNode) => {
        const value = textNode.value;
        await Promise.all(value.split(/\s+/).map(async (word) => {
            const possibleCandidates = await engine.findNotesMeta({
                fname: word,
                vault: note.vault,
                excludeStub: true,
            });
            linkCandidates.push(...possibleCandidates.map((candidate) => {
                const startColumn = value.indexOf(word) + 1;
                const endColumn = startColumn + word.length;
                const position = {
                    start: {
                        line: textNode.position.start.line,
                        column: startColumn,
                        offset: textNode.position.start.offset
                            ? textNode.position.start.offset + startColumn - 1
                            : undefined,
                    },
                    end: {
                        line: textNode.position.start.line,
                        column: endColumn,
                        offset: textNode.position.start.offset
                            ? textNode.position.start.offset + endColumn - 1
                            : undefined,
                    },
                };
                return {
                    type: "linkCandidate",
                    from: common_all_1.NoteUtils.toNoteLoc(note),
                    value: value.trim(),
                    position,
                    to: {
                        fname: word,
                        vaultName: common_all_1.VaultUtils.getName(candidate.vault),
                    },
                };
            }));
        }));
    }));
    return linkCandidates;
};
/**
 * Use this version during engine initialization on the engine side, where the
 * entire set of noteDicts is available. This version uses local data so it's
 * much faster.
 * @param param0
 * @returns
 */
const getLinkCandidatesSync = ({ ast, note, noteDicts, }) => {
    const textNodes = [];
    (0, unist_util_visit_1.default)(ast, [types_1.DendronASTTypes.TEXT], (node, _index, parent) => {
        if ((parent === null || parent === void 0 ? void 0 : parent.type) === "paragraph" || (parent === null || parent === void 0 ? void 0 : parent.type) === "tableCell") {
            textNodes.push(node);
        }
    });
    const linkCandidates = [];
    lodash_1.default.map(textNodes, (textNode) => {
        const value = textNode.value;
        value.split(/\s+/).map((word) => {
            const possibleCandidates = common_all_1.NoteDictsUtils.findByFname({
                fname: word,
                noteDicts,
                vault: note.vault,
            })
                // await engine.findNotesMeta({ fname: word, vault: note.vault })
                .filter((note) => note.stub !== true);
            linkCandidates.push(...possibleCandidates.map((candidate) => {
                const startColumn = value.indexOf(word) + 1;
                const endColumn = startColumn + word.length;
                const position = {
                    start: {
                        line: textNode.position.start.line,
                        column: startColumn,
                        offset: textNode.position.start.offset
                            ? textNode.position.start.offset + startColumn - 1
                            : undefined,
                    },
                    end: {
                        line: textNode.position.start.line,
                        column: endColumn,
                        offset: textNode.position.start.offset
                            ? textNode.position.start.offset + endColumn - 1
                            : undefined,
                    },
                };
                return {
                    type: "linkCandidate",
                    from: common_all_1.NoteUtils.toNoteLoc(note),
                    value: value.trim(),
                    position,
                    to: {
                        fname: word,
                        vaultName: common_all_1.VaultUtils.getName(candidate.vault),
                    },
                };
            }));
        });
    });
    return linkCandidates;
};
class LinkUtils {
    static astType2DLinkType(type) {
        switch (type) {
            case types_1.DendronASTTypes.WIKI_LINK:
                return "wiki";
            case types_1.DendronASTTypes.REF_LINK_V2:
                return "ref";
            default:
                throw new common_all_1.DendronError({ message: `invalid type conversion: ${type}` });
        }
    }
    static dlink2DNoteLink(link) {
        var _a;
        return {
            data: {
                xvault: link.xvault,
                sameFile: link.sameFile,
            },
            from: {
                fname: link.value,
                alias: link.alias,
                anchorHeader: (_a = link.to) === null || _a === void 0 ? void 0 : _a.anchorHeader,
                vaultName: link.from.vaultName,
            },
            type: link.type,
            position: link.position,
        };
    }
    /**
     * Get links from note body while maintaining existing backlinks
     */
    static async findLinks({ note, engine, type, config, filter, }) {
        let links = [];
        switch (type) {
            case "regular":
                links = LinkUtils.findLinksFromBody({
                    note,
                    filter,
                    config,
                });
                break;
            case "candidate":
                links = await LinkUtils.findLinkCandidates({
                    note,
                    engine,
                    config,
                });
                break;
            default:
                (0, common_all_1.assertUnreachable)(type);
        }
        const backlinks = note.links.filter((link) => link.type === "backlink");
        return links.concat(backlinks);
    }
    /**
     * Get all links from the note body
     * Currently, just look for wiki links
     *
     * @param opts.filter - {type, loc
     *
     * - type: filter by {@link DendronASTTypes}
     * - loc: filter by {@link DLoc}
     */
    static findLinksFromBody({ note, config, filter, }) {
        const content = note.body;
        const remark = utilsv5_1.MDUtilsV5.procRemarkParseFull({ flavor: utilsv5_1.ProcFlavor.REGULAR }, {
            noteToRender: note,
            fname: note.fname,
            vault: note.vault,
            dest: types_1.DendronASTDest.MD_DENDRON,
            config,
        });
        const out = remark.parse(content);
        const links = getLinks({
            ast: out,
            filter: { loc: filter === null || filter === void 0 ? void 0 : filter.loc },
            note,
        });
        return links;
    }
    static findHashTags({ links }) {
        return links.filter((l) => {
            if (l.to) {
                return l.value.startsWith("tags.");
            }
            return false;
        });
    }
    static isAlias(link) {
        return link.indexOf("|") !== -1;
    }
    static hasFilter(link) {
        return link.indexOf(">") !== -1;
    }
    static parseAliasLink(link) {
        const [alias, value] = link.split("|").map(lodash_1.default.trim);
        return { alias, value: common_all_1.NoteUtils.normalizeFname(value) };
    }
    /** Either value or anchorHeader will always be present if the function did not
     *  return null. A missing value means that the file containing this link is
     *  the value.
     *
     *  if `explicitAlias` is false, non-existent alias will be
     *  implicitly assumed to be the value of the link.
     */
    static parseLinkV2(opts) {
        const { linkString, explicitAlias } = lodash_1.default.defaults(opts, {
            explicitAlias: false,
        });
        const re = new RegExp(common_all_1.LINK_CONTENTS, "i");
        const out = linkString.match(re);
        if (out && out.groups) {
            let aliasToUse;
            let { alias, value } = out.groups;
            const { anchor } = out.groups;
            if (!value && !anchor)
                return null; // Does not actually link to anything
            let vaultName;
            if (value) {
                // remove spaces
                value = lodash_1.default.trim(value);
                ({ vaultName, link: value } = (0, common_all_1.parseDendronURI)(value));
                if (!alias && !explicitAlias) {
                    alias = value;
                }
                aliasToUse = alias ? lodash_1.default.trim(alias) : undefined;
            }
            return {
                alias: aliasToUse,
                value,
                anchorHeader: anchor,
                vaultName,
                sameFile: lodash_1.default.isUndefined(value),
            };
        }
        else {
            return null;
        }
    }
    static async getNotesFromWikiLinks(opts) {
        const { activeNote, wikiLinks, engine } = opts;
        const { vaults } = engine;
        const resps = await Promise.all(wikiLinks.map((wikiLink) => {
            const fname = wikiLink.sameFile ? activeNote.fname : wikiLink.value;
            const vault = wikiLink.vaultName
                ? common_all_1.VaultUtils.getVaultByName({
                    vname: wikiLink.vaultName,
                    vaults,
                })
                : undefined;
            return engine.findNotes({ fname, vault });
        }));
        return resps.flat();
    }
    static parseLink(linkMatch) {
        linkMatch = common_all_1.NoteUtils.normalizeFname(linkMatch);
        let out = {
            value: linkMatch,
            alias: linkMatch,
        };
        if (LinkUtils.isAlias(linkMatch)) {
            out = LinkUtils.parseAliasLink(linkMatch);
        }
        if (out.value.indexOf("#") !== -1) {
            const [value, anchorHeader] = out.value.split("#").map(lodash_1.default.trim);
            out.value = value;
            out.anchorHeader = anchorHeader;
            // if we didn't have an alias, links with a # anchor shouldn't have # portion be in the title
            if (!LinkUtils.isAlias(linkMatch)) {
                out.alias = value;
            }
        }
        return out;
    }
    static parseNoteRefRaw(ref) {
        var _a;
        const optWikiFileName = /([^\]:#]*)/.source;
        const wikiFileName = /([^\]:#]+)/.source;
        const reLink = new RegExp("" +
            `(?<name>${optWikiFileName})` +
            `(${new RegExp(
            // anchor start
            "" +
                /#?/.source +
                `(?<anchorStart>${wikiFileName})` +
                // anchor stop
                `(:#(?<anchorEnd>${wikiFileName}))?`).source})?`, "i");
        // pre-parse alias if it exists
        let alias;
        const [aliasPartFirst, aliasPartSecond] = ref.split("|");
        if (lodash_1.default.isUndefined(aliasPartSecond))
            ref = aliasPartFirst;
        else {
            alias = aliasPartFirst;
            ref = aliasPartSecond;
        }
        // pre-parse vault name if it exists
        let vaultName;
        ({ vaultName, link: ref } = (0, common_all_1.parseDendronURI)(ref));
        const groups = (_a = reLink.exec(ref)) === null || _a === void 0 ? void 0 : _a.groups;
        const clean = {
            type: "file",
        };
        let fname;
        lodash_1.default.each(groups, (v, k) => {
            var _a, _b;
            if (lodash_1.default.isUndefined(v)) {
                return;
            }
            if (k === "name") {
                // remove .md extension if it exists, but keep full path in case this is an image
                fname = (_b = (_a = /^(?<name>.*?)(\.md)?$/.exec(lodash_1.default.trim(v))) === null || _a === void 0 ? void 0 : _a.groups) === null || _b === void 0 ? void 0 : _b.name;
            }
            else {
                // @ts-ignore
                clean[k] = v;
            }
        });
        if (clean.anchorStart && clean.anchorStart.indexOf(",") >= 0) {
            const [anchorStart, offset] = clean.anchorStart.split(",");
            clean.anchorStart = anchorStart;
            clean.anchorStartOffset = parseInt(offset, 10);
        }
        if (lodash_1.default.isUndefined(fname) && lodash_1.default.isUndefined(clean.anchorStart)) {
            throw new common_all_1.DendronError({
                message: `both fname and anchorStart for ${ref} is undefined`,
            });
        }
        if (vaultName) {
            clean.vaultName = vaultName;
        }
        // TODO
        // @ts-ignore
        return { from: { fname, alias }, data: clean, type: "ref" };
    }
    static parseNoteRef(ref) {
        var _a;
        const noteRef = LinkUtils.parseNoteRefRaw(ref);
        if (lodash_1.default.isUndefined((_a = noteRef.from) === null || _a === void 0 ? void 0 : _a.fname) &&
            lodash_1.default.isUndefined(noteRef.data.anchorStart)) {
            throw new common_all_1.DendronError({
                message: `both fname and anchorStart for ${ref} is undefined`,
            });
        }
        // @ts-ignore
        return noteRef;
    }
    static renderNoteLink({ link, dest, }) {
        switch (dest) {
            case types_1.DendronASTDest.MD_DENDRON: {
                if (this.isHashtagLink(link.from)) {
                    return link.from.alias;
                }
                if (this.isUserTagLink(link.from)) {
                    return link.from.alias;
                }
                const ref = link.type === "ref" ? "!" : "";
                const vaultPrefix = link.from.vaultName && link.data.xvault
                    ? `${common_all_1.CONSTANTS.DENDRON_DELIMETER}${link.from.vaultName}/`
                    : "";
                let value = link.from.fname;
                const alias = !lodash_1.default.isUndefined(link.from.alias) && link.from.alias !== value
                    ? link.from.alias + "|"
                    : undefined;
                const anchor = link.from.anchorHeader
                    ? `#${link.from.anchorHeader}`
                    : "";
                if (link.data.sameFile && anchor !== "") {
                    // This is a same file reference, for example `[[#anchor]]`
                    value = "";
                }
                // TODO: take into account piping direction
                return [ref, `[[`, alias, vaultPrefix, value, anchor, `]]`].join("");
            }
            default:
                throw new common_all_1.DendronError({
                    message: "Tried to render a link to an unexpected format",
                    payload: {
                        ctx: "renderNoteLink",
                        dest,
                        link,
                    },
                });
        }
    }
    /**
     * Given a note, updates old link to new link.
     * If you are calling this on a note multiple times,
     * You need to start from the last link in the body
     * Because each updateLink call will shift the location of
     * every element in the note body that comes after
     * the link you update
     *
     * @param note the note that contains link to update
     * @param oldLink the old link that needs to be updated
     * @param newLink new link
     * @returns
     */
    static updateLink({ note, oldLink, newLink, }) {
        if (oldLink.type === "frontmatterTag") {
            // Just change the prop
            const oldTag = oldLink.from.alias;
            const newTag = newLink.from.alias;
            common_all_1.TagUtils.replaceTag({ note, oldTag, newTag });
            return note.body;
        }
        else {
            // Need to update note body
            const { start, end } = oldLink.position;
            const startOffset = start.offset;
            const endOffset = end.offset;
            const body = note.body;
            const newBody = [
                body.slice(0, startOffset),
                LinkUtils.renderNoteLink({
                    link: newLink,
                    dest: types_1.DendronASTDest.MD_DENDRON,
                }),
                body.slice(endOffset),
            ].join("");
            return newBody;
        }
    }
    static isHashtagLink(link) {
        return (link.alias !== undefined &&
            link.alias.startsWith("#") &&
            link.fname.startsWith(common_all_1.TAGS_HIERARCHY_BASE));
    }
    static isUserTagLink(link) {
        return (link.alias !== undefined &&
            link.alias.startsWith("@") &&
            link.fname.startsWith(common_all_1.USERS_HIERARCHY_BASE));
    }
    static async findLinkCandidates({ note, engine, config, }) {
        const content = note.body;
        const remark = utilsv5_1.MDUtilsV5.procRemarkParse({ mode: utilsv5_1.ProcMode.FULL }, {
            noteToRender: note,
            fname: note.fname,
            vault: note.vault,
            dest: types_1.DendronASTDest.MD_DENDRON,
            config,
        });
        const tree = remark.parse(content);
        const linkCandidates = await getLinkCandidates({
            engine,
            ast: tree,
            note,
        });
        return linkCandidates;
    }
    /**
     *  Use this version during engine initialization on the engine side, where
     *  the entire set of noteDicts is available. This version uses local data so
     *  it's much faster.
     * @param param0
     * @returns
     */
    static findLinkCandidatesSync({ note, noteDicts, config, }) {
        const content = note.body;
        const remark = utilsv5_1.MDUtilsV5.procRemarkParse({ mode: utilsv5_1.ProcMode.FULL }, {
            noteToRender: note,
            fname: note.fname,
            vault: note.vault,
            dest: types_1.DendronASTDest.MD_DENDRON,
            config,
        });
        const tree = remark.parse(content);
        const linkCandidates = getLinkCandidatesSync({
            noteDicts,
            ast: tree,
            note,
        });
        return linkCandidates;
    }
    static hasVaultPrefix(link) {
        var _a;
        if ((_a = link.to) === null || _a === void 0 ? void 0 : _a.vaultName) {
            return true;
        }
        else
            return false;
    }
    /**
     * Given a source string, extract all wikilinks within the source.
     *
     * @param source string to extract wikilinks from
     */
    static extractWikiLinks(source) {
        // chop up the source.
        const regExp = new RegExp("\\[\\[(.+?)?\\]\\]", "g");
        const matched = [...source.matchAll(regExp)].map((match) => {
            return LinkUtils.parseLinkV2({ linkString: match[1] });
        });
        return matched.filter((match) => !lodash_1.default.isNull(match));
    }
    /**
     * Given an array of links that need to be updated,
     * and a note that contains the links,
     * update all links in given array so that they point to
     * the destination note.
     *
     * returns note change entries
     */
    static async updateLinksInNote(opts) {
        const { linksToUpdate, note, destNote, engine } = opts;
        // sort links to update in descending order of appearance.
        // this is necessary in order to preserve the link positions.
        const linksToUpdateDesc = lodash_1.default.orderBy(linksToUpdate, (link) => {
            var _a;
            return (_a = link.position) === null || _a === void 0 ? void 0 : _a.start.offset;
        }, "desc");
        const modifiedNote = await lodash_1.default.reduce(linksToUpdateDesc, async (prev, linkToUpdate) => {
            // wait for last iteration.
            const acc = await prev;
            const oldLink = linkToUpdate;
            // see if we have more than one note with same fname as destination
            // if so, we need to specify the vault in the link.
            const notesWithSameName = await engine.findNotesMeta({
                fname: destNote.fname,
            });
            // there are more than one note with same name, or the link we are updating
            // is already a cross vault link.
            const isXVault = oldLink.data.xvault || notesWithSameName.length > 1;
            // create the new link
            const newLink = {
                // inherits most of the old link's data,
                ...oldLink,
                from: {
                    ...oldLink.from,
                    // if it had an alias, keep it. otherwise, it's going to be
                    // updated to the destination's fname
                    alias: oldLink.from.alias === oldLink.from.fname
                        ? destNote.fname
                        : oldLink.from.alias,
                    fname: destNote.fname,
                    vaultName: common_all_1.VaultUtils.getName(destNote.vault),
                },
                data: {
                    // preserve the cross vault status or add it if necessary
                    xvault: isXVault,
                    // if the link was originally a sameFile link,
                    // we need to flip this so the new link correctly
                    // renders as regular wikilink
                    sameFile: note.id === destNote.fname,
                },
            };
            const newBody = LinkUtils.updateLink({
                note: acc,
                oldLink,
                newLink,
            });
            acc.body = newBody;
            return acc;
        }, Promise.resolve(note));
        note.body = modifiedNote.body;
        const writeResp = await engine.writeNote(note);
        return writeResp;
    }
}
exports.LinkUtils = LinkUtils;
class AnchorUtils {
    /** Given a header, finds the text of that header, including any wikilinks or hashtags that are included in the header.
     *
     * For example, for the header `## Foo [[Bar|bar]] and #baz`, the text should be `Foo Bar and #baz`.
     */
    static headerText(header) {
        const headerText = [];
        (0, unist_util_visit_1.default)(header, (node) => {
            switch (node.type) {
                case types_1.DendronASTTypes.TEXT:
                    headerText.push(node.value);
                    break;
                case types_1.DendronASTTypes.WIKI_LINK:
                    headerText.push(node.data.alias);
                    break;
                case types_1.DendronASTTypes.HASHTAG:
                    headerText.push(node.value);
                    break;
                case types_1.DendronASTTypes.USERTAG:
                    headerText.push(node.value);
                    break;
                case types_1.DendronASTTypes.INLINE_CODE:
                    headerText.push(node.value);
                    break;
                default:
                /* nothing */
            }
        });
        return lodash_1.default.trim(headerText.join(""));
    }
    /** Given a header, finds the range of text that marks the contents of the header.
     *
     * For example, for the header `## Foo [[Bar|bar]] and #baz`, the range will start after `## ` and end at the end of the line.
     */
    static headerTextPosition(header) {
        let start;
        let end;
        (0, unist_util_visit_1.default)(header, [
            types_1.DendronASTTypes.TEXT,
            types_1.DendronASTTypes.WIKI_LINK,
            types_1.DendronASTTypes.HASHTAG,
            types_1.DendronASTTypes.BLOCK_ANCHOR,
        ], (node) => {
            if (node.type === types_1.DendronASTTypes.BLOCK_ANCHOR && end) {
                // Preserve whitespace after the header, for example `# foo ^bar`, where
                // `^bar` must be separated with a space since it's not part of the header
                end.column -= 1;
                return;
            }
            if (lodash_1.default.isUndefined(start))
                start = node.position.start;
            end = node.position.end;
        });
        if (lodash_1.default.isUndefined(start) || lodash_1.default.isUndefined(end))
            throw new common_all_1.DendronError({
                message: "Unable to find the region of text containing the header",
            });
        return { start, end };
    }
    /** Given a *parsed* anchor node, returns the anchor id ("header" or "^block" and positioned anchor object for it. */
    static anchorNode2anchor(node, slugger) {
        if (lodash_1.default.isUndefined(node.position))
            return undefined;
        const { line, column } = node.position.start;
        if (node.type === types_1.DendronASTTypes.HEADING) {
            const headerNode = node;
            const text = this.headerText(headerNode);
            const value = slugger.slug(this.headerText(headerNode));
            return [
                value,
                {
                    type: "header",
                    text,
                    value,
                    line: line - 1,
                    column: column - 1,
                    depth: headerNode.depth,
                },
            ];
        }
        else if (node.type === types_1.DendronASTTypes.BLOCK_ANCHOR) {
            return [
                `^${node.id}`,
                {
                    type: "block",
                    value: node.id,
                    line: line - 1,
                    column: column - 1,
                },
            ];
        }
        else {
            (0, common_all_1.assertUnreachable)(node);
        }
    }
    static findAnchors(opts) {
        if (opts.note.stub)
            return {};
        try {
            const noteContents = common_all_1.NoteUtils.serialize(opts.note);
            const noteAnchors = RemarkUtils.findAnchors(noteContents);
            const slugger = (0, common_all_1.getSlugger)();
            const anchors = noteAnchors
                .map((anchor) => this.anchorNode2anchor(anchor, slugger))
                .filter(common_all_1.isNotUndefined);
            return Object.fromEntries(anchors);
        }
        catch (err) {
            // TODO: re-enable logging
            // const error = DendronError.createFromStatus({
            //   status: ERROR_STATUS.UNKNOWN,
            //   payload: { note: NoteUtils.toLogObj(opts.note) },
            //   innerError: err as Error,
            // });
            // const { logger, dispose } = createDisposableLogger("AnchorUtils");
            // logger.error(error);
            // dispose();
            return {};
        }
    }
    static anchor2string(anchor) {
        if (anchor.type === "block")
            return `^${anchor.value}`;
        if (anchor.type === "header")
            return anchor.value;
        if (anchor.type === "line")
            return `L${anchor.line}`;
        (0, common_all_1.assertUnreachable)(anchor);
    }
    static string2anchor(anchor) {
        if ((0, common_all_1.isBlockAnchor)(anchor))
            return {
                type: "block",
                value: anchor.slice(1, undefined),
                text: anchor,
            };
        else if ((0, common_all_1.isLineAnchor)(anchor))
            return {
                type: "line",
                line: Number.parseInt(anchor.slice(1, undefined), 10),
                value: anchor,
            };
        return {
            type: "header",
            value: anchor,
            text: anchor,
        };
    }
}
exports.AnchorUtils = AnchorUtils;
function walk(node, fn) {
    fn(node);
    if (node.children) {
        node.children.forEach((n) => {
            // @ts-ignore
            walk(n, fn);
        });
    }
}
const MAX_HEADING_DEPTH = 99999;
const NODE_TYPES_TO_EXTRACT = [
    types_1.DendronASTTypes.BLOCK_ANCHOR,
    types_1.DendronASTTypes.HEADING,
    types_1.DendronASTTypes.LIST,
    types_1.DendronASTTypes.LIST_ITEM,
    types_1.DendronASTTypes.TABLE,
    types_1.DendronASTTypes.PARAGRAPH,
];
class RemarkUtils {
    /**
     * Use this to [[Get the line offset of the frontmatter|dendron://dendron.docs/pkg.plugin-core.dev.cook#get-the-line-offset-of-the-frontmatter]]
     * Given a string representation of a Dendron note,
     * return the position of the line right after the frontmatter.
     * @param fileText file content string to traverse
     * @returns position in parsed file content right after the frontmatter
     */
    static getNodePositionPastFrontmatter(fileText) {
        const proc = utilsv5_1.MDUtilsV5.procRemarkParseNoData({}, { dest: types_1.DendronASTDest.MD_DENDRON });
        const parsed = proc.parse(fileText);
        let out;
        (0, unist_util_visit_1.default)(parsed, ["yaml"], (node) => {
            if (lodash_1.default.isUndefined(node.position))
                return false; // should never happen
            out = node.position;
            return false;
        });
        return out;
    }
    static bumpHeadings(root, baseDepth) {
        const headings = [];
        walk(root, (node) => {
            if (node.type === types_1.DendronASTTypes.HEADING) {
                headings.push(node);
            }
        });
        const minDepth = headings.reduce((memo, h) => {
            return Math.min(memo, h.depth);
        }, MAX_HEADING_DEPTH);
        const diff = baseDepth + 1 - minDepth;
        headings.forEach((h) => {
            h.depth += diff;
        });
    }
    static findAnchors(content) {
        const parser = utilsv5_1.MDUtilsV5.procRemarkParseNoData({}, { dest: types_1.DendronASTDest.HTML });
        const parsed = parser.parse(content);
        return [
            ...(0, unist_util_select_1.selectAll)(types_1.DendronASTTypes.HEADING, parsed),
            ...(0, unist_util_select_1.selectAll)(types_1.DendronASTTypes.BLOCK_ANCHOR, parsed),
        ];
    }
    static isHeading(node, text, depth) {
        if (node.type !== types_1.DendronASTTypes.HEADING) {
            return false;
        }
        // wildcard is always true
        if (text === "*") {
            return true;
        }
        if (text) {
            const headingText = toString(node);
            return text.trim().toLowerCase() === headingText.trim().toLowerCase();
        }
        if (depth) {
            return node.depth <= depth;
        }
        return true;
    }
    static isRoot(node) {
        return node.type === types_1.DendronASTTypes.ROOT;
    }
    static isParent(node) {
        return lodash_1.default.isArray(node.children);
    }
    static isParagraph(node) {
        return node.type === types_1.DendronASTTypes.PARAGRAPH;
    }
    static isTable(node) {
        return node.type === types_1.DendronASTTypes.TABLE;
    }
    static isTableRow(node) {
        return node.type === types_1.DendronASTTypes.TABLE_ROW;
    }
    static isTableCell(node) {
        return node.type === types_1.DendronASTTypes.TABLE_CELL;
    }
    static isList(node) {
        return node.type === types_1.DendronASTTypes.LIST;
    }
    static isNoteRefV2(node) {
        return node.type === types_1.DendronASTTypes.REF_LINK_V2;
    }
    static isImage(node) {
        return node.type === types_1.DendronASTTypes.IMAGE;
    }
    static isExtendedImage(node) {
        return node.type === types_1.DendronASTTypes.EXTENDED_IMAGE;
    }
    static isText(node) {
        return node.type === types_1.DendronASTTypes.TEXT;
    }
    static isLink(node) {
        return node.type === types_1.DendronASTTypes.LINK;
    }
    static isWikiLink(node) {
        return node.type === types_1.DendronASTTypes.WIKI_LINK;
    }
    static isFootnoteDefinition(node) {
        return node.type === types_1.DendronASTTypes.FOOTNOTE_DEFINITION;
    }
    static isFrontmatter(node) {
        return node.type === types_1.DendronASTTypes.FRONTMATTER;
    }
    static isHTML(node) {
        return node.type === types_1.DendronASTTypes.HTML;
    }
    static isCode(node) {
        return node.type === types_1.DendronASTTypes.CODE;
    }
    static isYAML(node) {
        return node.type === types_1.DendronASTTypes.YAML;
    }
    static isHashTag(node) {
        return node.type === types_1.DendronASTTypes.HASHTAG;
    }
    static isUserTag(node) {
        return node.type === types_1.DendronASTTypes.USERTAG;
    }
    static isNodeWithPosition(node) {
        return node.position !== undefined;
    }
    // --- conversion
    static convertLinksFromDotNotation(note, changes) {
        const prevNote = { ...note };
        return function () {
            return (tree, _vfile) => {
                const root = tree;
                const wikiLinks = (0, unist_util_select_1.selectAll)(types_1.DendronASTTypes.WIKI_LINK, root);
                let dirty = false;
                wikiLinks.forEach((linkNode) => {
                    let newValue = linkNode.value;
                    // Add a leading slash to the path as some markdown parsers require it for links
                    if (!newValue.startsWith("/")) {
                        newValue = "/" + newValue;
                        dirty = true;
                    }
                    if (linkNode.value.indexOf(".") >= 0) {
                        newValue = lodash_1.default.replace(newValue, /\./g, "/");
                        if (linkNode.data.alias === linkNode.value) {
                            linkNode.data.alias = newValue;
                        }
                        dirty = true;
                    }
                    // NOTE: important to add this at the end so that we don't convert `.md` to `/md`
                    linkNode.value = newValue + ".md";
                });
                //TODO: Add support for Ref Notes and Block Links
                if (dirty) {
                    changes.push({
                        note,
                        prevNote,
                        status: "update",
                    });
                }
            };
        };
    }
    static convertWikiLinkToNoteUrl(note, changes, engine, dendronConfig) {
        const prevNote = { ...note };
        // eslint-disable-next-line func-names
        return function () {
            return async (tree, _vfile) => {
                const root = tree;
                const wikiLinks = (0, unist_util_select_1.selectAll)(types_1.DendronASTTypes.WIKI_LINK, root);
                let dirty = false;
                await (0, common_all_1.asyncLoop)(wikiLinks, async (linkNode) => {
                    let vault;
                    if (!lodash_1.default.isUndefined(linkNode.data.vaultName)) {
                        vault = common_all_1.VaultUtils.getVaultByName({
                            vaults: engine.vaults,
                            vname: linkNode.data.vaultName,
                        });
                    }
                    const existingNote = (await engine.findNotesMeta({ fname: linkNode.value, vault }))[0];
                    if (existingNote) {
                        const publishingConfig = common_all_1.ConfigUtils.getPublishing(dendronConfig);
                        const urlRoot = publishingConfig.siteUrl || "";
                        const { vault } = existingNote;
                        linkNode.value = RemarkUtils.getNoteUrl({
                            config: dendronConfig,
                            note: existingNote,
                            vault,
                            urlRoot,
                            anchor: linkNode.data.anchorHeader,
                        });
                        dirty = true;
                    }
                });
                if (dirty) {
                    changes.push({
                        note,
                        prevNote,
                        status: "update",
                    });
                }
            };
        };
    }
    static h1ToTitle(note, changes) {
        const prevNote = { ...note };
        return function () {
            return (tree, _vfile) => {
                const root = tree;
                const idx = lodash_1.default.findIndex(root.children, (ent) => ent.type === types_1.DendronASTTypes.HEADING && ent.depth === 1);
                if (idx >= 0) {
                    const head = root.children.splice(idx, 1)[0];
                    if (head.children.length === 1 && head.children[0].type === "text") {
                        note.title = head.children[0].value;
                    }
                    changes.push({
                        note,
                        prevNote,
                        status: "update",
                    });
                }
            };
        };
    }
    static h1ToH2(note, changes) {
        const prevNote = { ...note };
        return function () {
            return (tree, _vfile) => {
                const root = tree;
                const idx = lodash_1.default.findIndex(root.children, (ent) => ent.type === types_1.DendronASTTypes.HEADING && ent.depth === 1);
                if (idx >= 0) {
                    const head = root.children[idx];
                    head.depth = 2;
                    changes.push({
                        note,
                        prevNote,
                        status: "update",
                    });
                }
            };
        };
    }
    /**
     * Given a markdown AST and a target heading node,
     * Find all the node that belongs under the heading.
     * This will extract all nodes until it hits the next heading
     * with the same depth of the target heading.
     * @param tree Abstract syntax tree
     * @param startHeaderDepth Heading to target
     * @returns nodes to extract
     */
    static extractHeaderBlock(tree, startHeaderDepth, startHeaderIndex, stopAtFirstHeader) {
        let nextHeaderIndex;
        if (!RemarkUtils.isParent(tree)) {
            return [];
        }
        (0, unist_util_visit_1.default)(tree, (node, _index) => {
            // we are still before the start index
            if (_index <= startHeaderIndex && !stopAtFirstHeader) {
                return;
            }
            if (nextHeaderIndex) {
                return;
            }
            if (node.type === types_1.DendronASTTypes.HEADING) {
                const depth = node.depth;
                if (depth <= startHeaderDepth)
                    nextHeaderIndex = _index;
            }
        });
        // edge case when we extract from beginning of note
        if (startHeaderIndex === 0 && nextHeaderIndex === 0) {
            return [];
        }
        // if we find a next header index, extract up to nextHedaer index
        // otherwise, extract from start
        const nodesToExtract = nextHeaderIndex
            ? tree.children.slice(startHeaderIndex, nextHeaderIndex)
            : tree.children.slice(startHeaderIndex);
        return nodesToExtract;
    }
    /** Extract all blocks from the note which could be referenced by a block anchor.
     *
     * If those blocks already have anchors (or if they are a header), this will also find that anchor.
     *
     * @param note The note from which blocks will be extracted.
     */
    static async extractBlocks({ note, config, }) {
        const proc = utilsv5_1.MDUtilsV5.procRemarkFull({
            noteToRender: note,
            vault: note.vault,
            fname: note.fname,
            dest: types_1.DendronASTDest.MD_DENDRON,
            config,
        });
        const slugger = (0, common_all_1.getSlugger)();
        // Read and parse the note
        const noteText = common_all_1.NoteUtils.serialize(note);
        const noteAST = proc.parse(noteText);
        // @ts-ignore
        if (lodash_1.default.isUndefined(noteAST.children))
            return [];
        // @ts-ignore
        const nodesToSearch = lodash_1.default.filter(noteAST.children, (node) => lodash_1.default.includes(NODE_TYPES_TO_EXTRACT, node.type));
        // Extract the blocks
        const blocks = [];
        for (const node of nodesToSearch) {
            // Block anchors at top level refer to the blocks before them
            if (node.type === types_1.DendronASTTypes.PARAGRAPH) {
                // These look like a paragraph...
                const parent = node;
                if (parent.children.length === 1) {
                    // ... that has only a block anchor in it ...
                    const child = parent.children[0];
                    if (child.type === types_1.DendronASTTypes.BLOCK_ANCHOR) {
                        // ... in which case this block anchor refers to the previous block, if any
                        const previous = lodash_1.default.last(blocks);
                        if (!lodash_1.default.isUndefined(previous))
                            [, previous.anchor] =
                                AnchorUtils.anchorNode2anchor(child, slugger) ||
                                    [];
                        // Block anchors themselves are not blocks, don't extract them
                        continue;
                    }
                }
            }
            // Extract list items out of lists. We also extract them from nested lists,
            // because block anchors can't refer to nested lists, only items inside of them
            if (node.type === types_1.DendronASTTypes.LIST) {
                (0, unist_util_visit_1.default)(node, [types_1.DendronASTTypes.LIST_ITEM], (listItem) => {
                    // The list item might have a block anchor inside of it.
                    let anchor;
                    (0, unist_util_visit_1.default)(listItem, [types_1.DendronASTTypes.BLOCK_ANCHOR, types_1.DendronASTTypes.LIST], (inListItem) => {
                        // Except if we hit a nested list, because then the block anchor refers to the item in the nested list
                        if (inListItem.type === types_1.DendronASTTypes.LIST)
                            return "skip";
                        [, anchor] =
                            AnchorUtils.anchorNode2anchor(inListItem, slugger) || [];
                        return;
                    });
                    blocks.push({
                        text: proc.stringify(listItem),
                        anchor,
                        // position can only be undefined for generated nodes, not for parsed ones
                        position: listItem.position,
                        type: listItem.type,
                    });
                });
            }
            // extract the anchor for this block, if it exists
            let anchor;
            if (node.type === types_1.DendronASTTypes.HEADING) {
                // Headings are anchors themselves
                [, anchor] =
                    AnchorUtils.anchorNode2anchor(node, slugger) || [];
            }
            else if (node.type !== types_1.DendronASTTypes.LIST) {
                // Other nodes might have block anchors inside them
                // Except lists, because anchors inside lists only refer to specific list items
                (0, unist_util_visit_1.default)(node, [types_1.DendronASTTypes.BLOCK_ANCHOR], (child) => {
                    [, anchor] =
                        AnchorUtils.anchorNode2anchor(child, slugger) || [];
                });
            }
            // extract the block
            blocks.push({
                text: proc.stringify(node),
                anchor,
                // position can only be undefined for generated nodes, not for parsed ones
                position: node.position,
                type: node.type,
            });
        }
        return blocks;
    }
    static extractFootnoteDefs(root) {
        return (0, unist_util_select_1.selectAll)(types_1.DendronASTTypes.FOOTNOTE_DEFINITION, root).filter(RemarkUtils.isFootnoteDefinition);
    }
    /**
     * Extract frontmatter tags from note
     * @param body
     * @returns
     */
    static extractFMTags(body) {
        let parsed;
        const noteAST = utilsv5_1.MDUtilsV5.procRemarkParseNoData({}, { dest: types_1.DendronASTDest.MD_DENDRON }).parse(body);
        (0, unist_util_visit_1.default)(noteAST, [types_1.DendronASTTypes.FRONTMATTER], (frontmatter) => {
            parsed = (0, yaml_1.parseFrontmatter)(frontmatter);
            return false; // stop traversing, there is only one frontmatter
        });
        if (parsed) {
            return (0, yaml_1.getFrontmatterTags)(parsed);
        }
        else {
            return [];
        }
    }
    // Copied from WorkspaceUtils:
    static getNoteUrl(opts) {
        const { config, note, anchor, vault } = opts;
        /**
         * set to true if index node, don't append id at the end
         */
        const { url: root, index } = SiteUtils_1.SiteUtils.getSiteUrlRootForVault({
            vault,
            config,
        });
        if (!root) {
            throw new common_all_1.DendronError({ message: "no urlRoot set" });
        }
        // if we have a note, see if we are at index
        const isIndex = lodash_1.default.isUndefined(note)
            ? false
            : SiteUtils_1.SiteUtils.isIndexNote({
                indexNote: index,
                note,
            });
        const pathValue = note.id;
        const siteUrlPath = SiteUtils_1.SiteUtils.getSiteUrlPathForNote({
            addPrefix: true,
            pathValue,
            config,
            pathAnchor: anchor,
        });
        const link = isIndex ? root : [root, siteUrlPath].join("");
        return link;
    }
}
/**
 * Recursively check if two given node has identical children.
 * At each level _position_ is omitted as this can change if
 * you are comparing from two different trees.
 * @param a first {@link Node} to compare
 * @param b second {@link Node} to compare
 * @returns boolean
 */
RemarkUtils.hasIdenticalChildren = (a, b) => {
    if (lodash_1.default.isEqual(Object.keys(a).sort(), Object.keys(b).sort())) {
        const aOmit = lodash_1.default.omit(a, ["position", "children"]);
        const bOmit = lodash_1.default.omit(b, ["position", "children"]);
        if (lodash_1.default.isEqual(aOmit, bOmit)) {
            if (lodash_1.default.has(a, "children")) {
                return lodash_1.default.every(
                // @ts-ignore
                a.children, (aChild, aIndex) => {
                    // @ts-ignore
                    const bChild = b.children[aIndex];
                    return RemarkUtils.hasIdenticalChildren(aChild, bChild);
                });
            }
            return true;
        }
        else {
            return false;
        }
    }
    else {
        return false;
    }
};
exports.RemarkUtils = RemarkUtils;
//# sourceMappingURL=utils.js.map