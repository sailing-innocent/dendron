"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FuseEngine = exports.getCleanThresholdValue = exports.createSerializedFuseNoteIndex = exports.createFuseNote = exports.FuseExtendedSearchConstants = void 0;
const fuse_js_1 = __importDefault(require("fuse.js"));
const lodash_1 = __importDefault(require("lodash"));
const _1 = require(".");
const stringUtil_1 = require("./util/stringUtil");
/** https://fusejs.io/examples.html#extended-search */
exports.FuseExtendedSearchConstants = {
    PrefixExactMatch: "^",
};
function createFuse(initList, opts, index) {
    const options = {
        shouldSort: true,
        threshold: opts.threshold,
        distance: 15,
        minMatchCharLength: 1,
        keys: ["fname"],
        useExtendedSearch: true,
        includeScore: true,
        // As long as we have ignoreLocation set to true location the location
        // value should be ignored.
        location: 0,
        ignoreLocation: true,
        ignoreFieldNorm: true,
        ...opts,
    };
    if (opts.preset === "schema") {
        options.keys = ["fname", "id"];
    }
    const fuse = new fuse_js_1.default(initList, options, index);
    return fuse;
}
function createFuseNote(publishedNotes, overrideOpts, index) {
    let notes;
    if (lodash_1.default.isArray(publishedNotes))
        notes = publishedNotes;
    else
        notes = Object.values(publishedNotes);
    return createFuse(notes, {
        preset: "note",
        keys: ["title", "body"],
        includeMatches: true,
        includeScore: true,
        findAllMatches: true,
        useExtendedSearch: true,
        ...overrideOpts,
    }, index);
}
exports.createFuseNote = createFuseNote;
function createSerializedFuseNoteIndex(publishedNotes, overrideOpts) {
    return createFuseNote(publishedNotes, overrideOpts).getIndex().toJSON();
}
exports.createSerializedFuseNoteIndex = createSerializedFuseNoteIndex;
const getCleanThresholdValue = (configThreshold) => {
    if (configThreshold < 0 || configThreshold > 1) {
        // Setting threshold to fallback threshold value in case configuration is incorrect.
        return _1.ConfigUtils.getLookup(_1.ConfigUtils.genDefaultConfig()).note
            .fuzzThreshold;
    }
    return configThreshold;
};
exports.getCleanThresholdValue = getCleanThresholdValue;
class FuseEngine {
    constructor(opts) {
        this.threshold =
            opts.mode === "exact" ? 0.0 : (0, exports.getCleanThresholdValue)(opts.fuzzThreshold);
        this.notesIndex = createFuse([], {
            preset: "note",
            threshold: this.threshold,
        });
        this.schemaIndex = createFuse([], {
            preset: "schema",
            threshold: this.threshold,
        });
    }
    querySchema({ qs }) {
        let items;
        if (qs === "") {
            const results = this.schemaIndex.search("root");
            items = [results[0].item];
        }
        else if (qs === "*") {
            // @ts-ignore
            items = this.schemaIndex._docs;
        }
        else {
            let results = this.schemaIndex.search(FuseEngine.formatQueryForFuse({ qs }));
            results = this.filterByThreshold(results);
            items = lodash_1.default.map(results, (resp) => resp.item);
        }
        return items;
    }
    /**
     * If qs = "", return root note
     * @param qs query string.
     * @param onlyDirectChildren query for direct children only.
     * @param originalQS original query string that was typed by the user.
     * @returns
     */
    queryNote({ qs, onlyDirectChildren, originalQS, }) {
        let items;
        if (qs === "") {
            const results = this.notesIndex.search("root");
            items = lodash_1.default.map(lodash_1.default.filter(results, (ent) => ent.item.fname === "root"), (ent) => ent.item);
            /// seearch eveyrthing
        }
        else if (qs === "*") {
            // @ts-ignore
            items = this.notesIndex._docs;
        }
        else {
            const formattedQS = FuseEngine.formatQueryForFuse({ qs });
            let results = this.notesIndex.search(formattedQS);
            results = this.postQueryFilter({
                results,
                queryString: formattedQS,
                onlyDirectChildren,
            });
            if (originalQS === undefined) {
                // TODO: add log WARN (does not appear to be easily accessible logger in common-all)
                originalQS = qs;
            }
            results = FuseEngine.sortResults({ results, originalQS });
            items = lodash_1.default.map(results, (resp) => resp.item);
        }
        return items;
    }
    filterByThreshold(results) {
        // TODO: Try to isolate and submit a bug to FuseJS.
        //
        // There appears to be a bug in FuseJS that sometimes it gives results with much higher
        // score than the threshold. From my understanding it should not do such thing.
        // Hence for now we will filter the results ourselves to adhere to threshold.
        //
        // Example data that was matched:
        // Querying for 'user.hikchoi.discussions.himewhat' with threshold of 0.2
        // Matched:
        // 'user.hikchoi.discussions.this' with 0.59375
        // 'user.hikchoi.discussions.triage-plans' with 0.59375
        // 'user.hikchoi.discussions.note-graph-glitch' with 0.59375
        // Other notes were matched with score of under 0.2
        // 'user.hikchoi.discussions.deleting-notes-with-links' with 0.1875
        // In fact all the notes I saw thus far that were out of threshold range were with '0.59375'
        return results.filter((r) => r.score <= this.threshold);
    }
    async replaceSchemaIndex(schemas) {
        this.schemaIndex.setCollection(lodash_1.default.map(lodash_1.default.values(schemas), (ent) => _1.SchemaUtils.getModuleRoot(ent)));
    }
    async replaceNotesIndex(notes) {
        this.notesIndex.setCollection(lodash_1.default.map(notes, ({ fname, title, id, vault, updated, stub }, _key) => ({
            fname,
            id,
            title,
            vault,
            updated,
            stub,
        })));
    }
    async updateNotesIndex(noteChanges) {
        return Promise.all(noteChanges.map(async (change) => {
            switch (change.status) {
                case "create": {
                    return this.addNoteToIndex(change.note);
                }
                case "delete": {
                    return this.removeNoteFromIndex(change.note);
                }
                case "update": {
                    // Fuse has no update. Must remove old and add new
                    this.removeNoteFromIndex(change.prevNote);
                    this.addNoteToIndex(change.note);
                    return;
                }
                default:
                    break;
            }
            return;
        }));
    }
    removeNoteFromIndex(note) {
        this.notesIndex.remove((doc) => {
            // FIXME: can be undefined, dunno why
            if (!doc) {
                return false;
            }
            return doc.id === note.id;
        });
    }
    addNoteToIndex(note) {
        const indexProps = lodash_1.default.pick(note, [
            "fname",
            "id",
            "title",
            "vault",
            "updated",
            "stub",
        ]);
        this.notesIndex.add(indexProps);
    }
    addSchemaToIndex(schema) {
        this.schemaIndex.add(_1.SchemaUtils.getModuleRoot(schema));
    }
    removeSchemaFromIndex(smod) {
        this.schemaIndex.remove((doc) => {
            // FIXME: can be undefined, dunno why
            if (!doc) {
                return false;
            }
            return doc.id === _1.SchemaUtils.getModuleRoot(smod).id;
        });
    }
    /**
     * Fuse does not support '*' as a wildcard. This replaces the `*` to a fuse equivalent
     * to make the engine do the right thing
     */
    static formatQueryForFuse({ qs }) {
        // Fuse does not appear to see [*] as anything special.
        // For example:
        // `dev*vs` matches `dendron.dev.ref.vscode` with score of 0.5
        //
        // To compare with
        // `dev vs` matches `dendron.dev.ref.vscode` with score of 0.001
        //
        // Fuse extended search https://fusejs.io/examples.html#extended-search
        // uses spaces for AND and '|' for OR hence this function will replace '*' with spaces.
        // We do this replacement since VSCode quick pick actually appears to respect '*'.
        return qs.split("*").join(" ");
    }
    /**
     * When there are multiple items with exact same score apply sorting
     * within that group of elements. (The items with better match scores
     * should still come before elements with worse match scores).
     * */
    static sortResults({ results, originalQS, }) {
        if (results.length === 0)
            return [];
        const sortOrder = [
            // We want match scores to be ascending since the lowest score
            // represents the best match. We first group sort by FuseJS score
            // Subsequently applying other sorts if the FuseJS score matches.
            {
                orderBy: (item) => item.score,
                order: "asc",
            },
            // if the item is a stub it should go towards the end of the same score match group.
            {
                orderBy: (item) => item.item.stub,
                order: "desc",
            },
            // Lowest distance is the closer match hence sort in ascending order.
            {
                orderBy: (item) => item.levenshteinDist,
                order: "asc",
            },
            // We want the items with the same match scores to be sorted by
            // descending order of their update date.
            {
                orderBy: (item) => item.item.updated,
                order: "desc",
            },
        ];
        const sorted = lodash_1.default.orderBy(results.map((res) => ({
            ...res,
            levenshteinDist: (0, stringUtil_1.levenshteinDistance)(res.item.fname, originalQS),
        })), sortOrder.map((v) => v.orderBy), sortOrder.map((v) => v.order));
        // Pull up exact match if it exists.
        if (originalQS) {
            const idx = sorted.findIndex((res) => res.item.fname === originalQS);
            if (idx !== -1) {
                const [spliced] = sorted.splice(idx, 1);
                sorted.unshift(spliced);
            }
        }
        return sorted;
    }
    postQueryFilter({ results, queryString, onlyDirectChildren, }) {
        // Filter by threshold due to what appears to be a FuseJS bug
        results = this.filterByThreshold(results);
        if (!FuseEngine.doesContainSpecialQueryChars(queryString)) {
            // When we use query language operators this filtering does not apply
            // since we can query the entry with a much longer query than file name length.
            // For example query fname="hi-world" with query="^hi world$ !bye".
            //
            // For cases of simple file names (do not contain special query chars):
            // Filter out matches that are same length or less as query string but
            // are not exact.
            //
            // For example
            // 'user.nickolay.journal.2021.09.03'
            // matches
            // 'user.nickolay.journal.2021.09.02'
            // with a super low score of '0.03' but we don't want to display all the journal
            // dates with the same length. Hence whenever the length of our query is equal
            // or longer than the query results, we want to create a new note, not show those results.
            const lowerCaseQueryString = queryString.toLowerCase();
            results = results.filter((r) => r.item.fname.length > queryString.length ||
                r.item.fname.toLowerCase() === lowerCaseQueryString);
        }
        if (onlyDirectChildren) {
            const depth = queryString.split(".").length;
            results = results
                .filter((ent) => {
                return _1.DNodeUtils.getFNameDepth(ent.item.fname) === depth;
            })
                .filter((ent) => !ent.item.stub);
        }
        return results;
    }
    /**
     * Returns true when string contains characters that FuseJS treats as special characters.
     * */
    static doesContainSpecialQueryChars(str) {
        return this.SPECIAL_QUERY_CHARACTERS.some((char) => str.includes(char));
    }
}
/**
 * Characters that are specially treated by FuseJS search
 * Reference https://fusejs.io/examples.html#extended-search
 *
 * Includes '*' which is not specially treated by FuseJS but we currently
 * map '*' to ' ' which specially treated by FuseJS.
 */
FuseEngine.SPECIAL_QUERY_CHARACTERS = [
    "*",
    " ",
    "|",
    "^",
    "$",
    "!",
    "=",
    "'",
];
exports.FuseEngine = FuseEngine;
//# sourceMappingURL=FuseEngine.js.map