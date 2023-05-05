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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HierarchyUtils = exports.stripLocalOnlyTags = exports.removeCache = exports.getCachePath = exports.createCacheEntry = exports.matchRefMarker = exports.parseFileLink = exports.parseDendronRef = exports.writeWSMetaFile = exports.openWSMetaFile = exports.getWSMetaFilePath = exports.refLink2Stringv2 = exports.normalizev2 = void 0;
const common_all_1 = require("@dendronhq/common-all");
const fs_extra_1 = __importDefault(require("fs-extra"));
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
__exportStar(require("./engineUtils"), exports);
/**
 * Details:
 * - trim white space, remove `#`, handle `*` and slug
 */
function normalizev2(text, slugger) {
    const u = lodash_1.default.trim(text, " #");
    if (u === "*") {
        return u;
    }
    return slugger.slug(u);
}
exports.normalizev2 = normalizev2;
/**
 * stringify a note ref link
 * @param opts
 * @returns
 */
function refLink2Stringv2(opts) {
    const { link, useVaultPrefix, rawAnchors } = opts;
    const slugger = (0, common_all_1.getSlugger)();
    const { anchorStart, anchorStartOffset, anchorEnd } = link.data;
    const { fname: name } = link.from;
    // [[foo]]#head1:#*"
    const linkParts = [`![[`];
    if (useVaultPrefix) {
        linkParts.push(common_all_1.CONSTANTS.DENDRON_DELIMETER + link.from.vaultName + "/");
    }
    linkParts.push(name);
    if (anchorStart) {
        if (rawAnchors) {
            linkParts.push(`#${anchorStart}`);
        }
        else {
            linkParts.push(`#${normalizev2(anchorStart, slugger)}`);
        }
    }
    if (anchorStartOffset) {
        linkParts.push(`,${anchorStartOffset}`);
    }
    if (anchorEnd) {
        if (rawAnchors) {
            linkParts.push(`:#${anchorEnd}`);
        }
        else {
            linkParts.push(`:#${normalizev2(anchorEnd, slugger)}`);
        }
    }
    linkParts.push("]]");
    return linkParts.join("");
}
exports.refLink2Stringv2 = refLink2Stringv2;
function getWSMetaFilePath({ wsRoot }) {
    const fsPath = path_1.default.join(wsRoot, common_all_1.CONSTANTS.DENDRON_WS_META);
    return fsPath;
}
exports.getWSMetaFilePath = getWSMetaFilePath;
function openWSMetaFile({ fpath }) {
    const wsMetaFileExists = fs_extra_1.default.existsSync(fpath);
    if (wsMetaFileExists) {
        return fs_extra_1.default.readJSONSync(fpath);
    }
    else {
        fs_extra_1.default.ensureFileSync(fpath);
        const defaultWSMeta = {
            version: "0.0.0",
            activationTime: 0,
        };
        writeWSMetaFile({ fpath, data: defaultWSMeta });
        return defaultWSMeta;
    }
}
exports.openWSMetaFile = openWSMetaFile;
function writeWSMetaFile({ fpath, data, }) {
    return fs_extra_1.default.writeJSONSync(fpath, data);
}
exports.writeWSMetaFile = writeWSMetaFile;
function parseDendronRef(ref) {
    const [idOrRef, ...rest] = lodash_1.default.trim(ref).split(":");
    const cleanArgs = lodash_1.default.trim(rest.join(":"));
    let link;
    let direction;
    if (idOrRef === "ref") {
        direction = "to";
        link = parseLink(cleanArgs);
    }
    else {
        throw Error(`parse non ref not implemented, ref: ${ref}`);
    }
    return { direction, link };
}
exports.parseDendronRef = parseDendronRef;
function parseFileLink(ref) {
    var _b;
    const wikiFileName = /([^\]:]+)/.source;
    const reLink = new RegExp("" +
        /\[\[/.source +
        `(?<name>${wikiFileName})` +
        /\]\]/.source +
        `(${new RegExp(
        // anchor start
        "" +
            /#?/.source +
            `(?<anchorStart>${wikiFileName})` +
            // anchor stop
            `(:#(?<anchorEnd>${wikiFileName}))?`).source})?`, "i");
    const groups = (_b = reLink.exec(ref)) === null || _b === void 0 ? void 0 : _b.groups;
    const clean = {
        type: "file",
    };
    let fname;
    lodash_1.default.each(groups, (v, k) => {
        if (lodash_1.default.isUndefined(v)) {
            return;
        }
        if (k === "name") {
            fname = path_1.default.basename(v, ".md");
        }
        else {
            // @ts-ignore
            clean[k] = v;
        }
    });
    if (lodash_1.default.isUndefined(fname)) {
        throw new common_all_1.DendronError({ message: `fname for ${ref} is undefined` });
    }
    if (clean.anchorStart && clean.anchorStart.indexOf(",") >= 0) {
        const [anchorStart, offset] = clean.anchorStart.split(",");
        clean.anchorStart = anchorStart;
        clean.anchorStartOffset = parseInt(offset, 10);
    }
    return { from: { fname }, data: clean, type: "ref" };
}
exports.parseFileLink = parseFileLink;
function parseLink(ref) {
    if (ref.indexOf("]") >= 0) {
        return parseFileLink(ref);
    }
    else {
        throw Error(`parseLink, non-file link, not implemented, ${ref}`);
    }
}
const matchRefMarker = (txt) => {
    return txt.match(/\(\((?<ref>[^)]+)\)\)/);
};
exports.matchRefMarker = matchRefMarker;
function createCacheEntry(opts) {
    const { noteProps, hash } = opts;
    return {
        data: lodash_1.default.omit(noteProps, "body"),
        hash,
    };
}
exports.createCacheEntry = createCacheEntry;
const getCachePath = (vpath) => {
    return path_1.default.join(vpath, common_all_1.CONSTANTS.DENDRON_CACHE_FILE);
};
exports.getCachePath = getCachePath;
const removeCache = (vpath) => {
    const cachePath = (0, exports.getCachePath)(vpath);
    if (fs_extra_1.default.pathExistsSync((0, exports.getCachePath)(cachePath))) {
        return fs_extra_1.default.remove(cachePath);
    }
    return;
};
exports.removeCache = removeCache;
/**
 @deprecated - remove after version 0.76
 * @param doc
 * @returns
 */
function stripLocalOnlyTags(doc) {
    const re = new RegExp(/(?<raw>.+<!--LOCAL_ONLY_LINE-->)/);
    let matches;
    do {
        matches = doc.match(re);
        if (matches) {
            // @ts-ignore
            const { raw, body } = matches.groups;
            doc = doc.replace(raw, "");
        }
    } while (matches);
    return doc;
}
exports.stripLocalOnlyTags = stripLocalOnlyTags;
class HierarchyUtils {
}
_a = HierarchyUtils;
/**
 * Get children of current note
 * @param opts.skipLevels: how many levels to skip for child
 * @returns
 */
HierarchyUtils.getChildren = async (opts) => {
    const { skipLevels, note, engine } = opts;
    let children = (await engine.bulkGetNotes(note.children)).data;
    let acc = 0;
    while (acc !== skipLevels) {
        // eslint-disable-next-line no-await-in-loop
        const descendants = await Promise.all(children
            .flatMap(async (ent) => (await engine.bulkGetNotes(ent.children)).data)
            .filter((ent) => !lodash_1.default.isUndefined(ent)));
        children = descendants.flat();
        acc += 1;
    }
    return children;
};
exports.HierarchyUtils = HierarchyUtils;
//# sourceMappingURL=index.js.map