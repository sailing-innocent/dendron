"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublishUtils = exports.MdastUtils = exports.renderFromNote = void 0;
/* eslint-disable no-plusplus */
const common_all_1 = require("@dendronhq/common-all");
// @ts-ignore
// @ts-ignore
const lodash_1 = __importDefault(require("lodash"));
const mdast_builder_1 = require("mdast-builder");
const path_1 = __importDefault(require("path"));
// import { normalizev2 } from "../utils";
const remark_1 = require("./remark");
const types_1 = require("./types");
const toString = require("mdast-util-to-string");
const renderFromNote = (opts) => {
    const { note } = opts;
    const contents = note.body;
    return contents;
};
exports.renderFromNote = renderFromNote;
/**
 * Borrowed from engine-server utils.ts
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
/** Contains functions that help dealing with MarkDown Abstract Syntax Trees. */
class MdastUtils {
    static genMDMsg(msg) {
        return (0, mdast_builder_1.root)((0, mdast_builder_1.paragraph)((0, mdast_builder_1.text)(msg)));
    }
    static genMDErrorMsg(msg) {
        return (0, mdast_builder_1.root)((0, mdast_builder_1.blockquote)((0, mdast_builder_1.text)(msg)));
    }
    static findHeader({ nodes, match, slugger, }) {
        const cSlugger = slugger !== null && slugger !== void 0 ? slugger : (0, common_all_1.getSlugger)();
        const cMatchText = lodash_1.default.isString(match)
            ? match
            : normalizev2(toString(match), (0, common_all_1.getSlugger)());
        let foundNode;
        const foundIndex = MdastUtils.findIndex(nodes, (node, idx) => {
            if (idx === 0 && match === "*") {
                return false;
            }
            const out = MdastUtils.matchHeading(node, cMatchText, {
                slugger: cSlugger,
            });
            if (out) {
                foundNode = node;
            }
            return out;
        });
        if (foundIndex < 0)
            return null;
        return {
            type: "header",
            index: foundIndex,
            node: foundNode,
            anchorType: "header",
        };
    }
    /** Find the index of the list element for which the predicate `fn` returns true.
     *
     * @returns The index where the element was found, -1 otherwise.
     */
    static findIndex(array, fn) {
        for (let i = 0; i < array.length; i++) {
            if (fn(array[i], i)) {
                return i;
            }
        }
        return -1;
    }
    /** A simplified and adapted version of visitParents from unist-utils-visit-parents, that also keeps track of indices of the ancestors as well.
     *
     * The limitations are:
     * * `test`, if used, can only be a string representing the type of the node that you want to visit
     * * Adding or removing siblings is undefined behavior
     * Please modify this function to add support for these if needed.
     */
    static visitParentsIndices({ nodes, test, visitor, }) {
        function recursiveTraversal(nodes, ancestors) {
            for (let i = 0; i < nodes.length; i++) {
                // visit the current node
                const node = nodes[i];
                let action;
                if (lodash_1.default.isUndefined(test) || node.type === test) {
                    action = visitor({ node, index: i, ancestors });
                }
                if (action === "skip")
                    return; // don't traverse the children of this node
                if (action === false)
                    return false; // stop traversing completely
                // visit the children of this node, if any
                // @ts-ignore
                if (node.children) {
                    const parent = node;
                    const newAncestors = [...ancestors, { ancestor: parent, index: i }];
                    const action = recursiveTraversal(parent.children, newAncestors);
                    if (action === false)
                        return; // stopping traversal
                }
            }
            return true; // continue traversal if needed
        }
        // Start recursion with no ancestors (everything is top level)
        recursiveTraversal(nodes, []);
    }
    /** Similar to `unist-utils-visit`, but allows async visitors.
     *
     * Children are visited in-order, not concurrently.
     *
     * @param test Use an empty list to visit all nodes, otherwise specify node types to be visited.
     * @param visitor Similar to `unist-util-visit`, returning true or undefined continues traversal, false stops traversal, and "skip" skips the children of that node.
     *
     * Depth-first pre-order traversal, same as `unist-util-visits`.
     */
    static async visitAsync(tree, test, visitor) {
        const visitQueue = new common_all_1.FIFOQueue([tree]);
        while (visitQueue.length > 0) {
            const node = visitQueue.dequeue();
            if (test.length === 0 || test.includes(node.type)) {
                // eslint-disable-next-line no-await-in-loop
                const out = await visitor(node);
                if (out === false)
                    return;
                if (out === "skip")
                    continue;
            }
            if (remark_1.RemarkUtils.isParent(node))
                visitQueue.enqueueAll(node.children);
        }
    }
    static matchHeading(node, matchText, opts) {
        const { depth, slugger } = opts;
        if (node.type !== types_1.DendronASTTypes.HEADING) {
            return false;
        }
        // wildcard is always true
        if (matchText === "*") {
            return true;
        }
        if (matchText) {
            const headingText = toString(node);
            return (matchText.trim().toLowerCase() === slugger.slug(headingText.trim()));
        }
        if (depth) {
            return node.depth <= depth;
        }
        return true;
    }
}
exports.MdastUtils = MdastUtils;
class PublishUtils {
    static getAbsUrlForAsset(opts) {
        const suffix = opts.suffix || "";
        const { config } = opts;
        const assetsPrefix = common_all_1.ConfigUtils.getAssetsPrefix(config);
        const siteUrl = this.getSiteUrl(config);
        let sitePrefix = lodash_1.default.trimEnd(siteUrl, "/");
        if (assetsPrefix) {
            sitePrefix = lodash_1.default.join([lodash_1.default.trimEnd(siteUrl, "/"), lodash_1.default.trim(assetsPrefix, "/")], "/");
        }
        const out = lodash_1.default.trimEnd(lodash_1.default.join([sitePrefix, lodash_1.default.trim(suffix, "/")], "/"), "/");
        return out;
    }
}
PublishUtils.getSiteUrl = (config) => {
    const publishingConfig = common_all_1.ConfigUtils.getPublishing(config);
    if ((0, common_all_1.getStage)() !== "dev") {
        const siteUrl = process.env["SITE_URL"] || publishingConfig.siteUrl;
        return siteUrl;
    }
    else {
        return ("http://" +
            path_1.default.posix.join(`localhost:${process.env.ELEV_PORT || 8080}`));
    }
};
exports.PublishUtils = PublishUtils;
//# sourceMappingURL=utils.js.map