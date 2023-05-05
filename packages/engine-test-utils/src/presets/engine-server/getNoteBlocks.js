"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENGINE_GET_NOTE_BLOCKS_PRESETS = void 0;
const common_test_utils_1 = require("@dendronhq/common-test-utils");
const lodash_1 = __importDefault(require("lodash"));
const runGetNoteBlocks = async ({ engine, vaults, note, filterByAnchorType, cb, }) => {
    if (lodash_1.default.isUndefined(note))
        note = (await engine.findNotes({
            fname: "test",
            vault: vaults[0],
        }))[0];
    const out = await engine.getNoteBlocks({
        id: note.id,
        filterByAnchorType,
    });
    return cb(out);
};
const preSetupHook = async ({ vaults, wsRoot }, { noteBody, fname }) => {
    await common_test_utils_1.NoteTestUtilsV4.createNote({
        vault: vaults[0],
        wsRoot,
        fname: fname || "test",
        body: noteBody,
    });
};
const NOTES = {
    PARAGRAPHS: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        return runGetNoteBlocks({
            engine,
            wsRoot,
            vaults,
            cb: ({ data }) => {
                return [
                    {
                        actual: data === null || data === void 0 ? void 0 : data.length,
                        expected: 3,
                    },
                ];
            },
        });
    }, {
        preSetupHook: (opts) => preSetupHook(opts, {
            noteBody: [
                "Et et quam culpa.",
                "",
                "Cumque molestiae qui deleniti.",
                "Eius odit commodi harum.",
                "",
                "Sequi ut non delectus tempore.",
            ].join("\n"),
        }),
    }),
    LIST: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        return runGetNoteBlocks({
            engine,
            wsRoot,
            vaults,
            cb: ({ data }) => {
                return [
                    {
                        actual: data === null || data === void 0 ? void 0 : data.length,
                        expected: 5,
                    },
                ];
            },
        });
    }, {
        preSetupHook: (opts) => preSetupHook(opts, {
            noteBody: [
                "Et et quam culpa.",
                "",
                "* Cumque molestiae qui deleniti.",
                "* Eius odit commodi harum.",
                "",
                "Sequi ut non delectus tempore.",
            ].join("\n"),
        }),
    }),
    NESTED_LIST: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        return runGetNoteBlocks({
            engine,
            wsRoot,
            vaults,
            cb: ({ data }) => {
                return [
                    {
                        actual: data === null || data === void 0 ? void 0 : data.length,
                        expected: 8,
                    },
                ];
            },
        });
    }, {
        preSetupHook: (opts) => preSetupHook(opts, {
            noteBody: [
                "Et et quam culpa.",
                "",
                "* Cumque molestiae qui deleniti.",
                "* Eius odit commodi harum.",
                "  * Sequi ut non delectus tempore.",
                "  * In delectus quam sunt unde.",
                "* Quasi ex debitis aut sed.",
                "",
                "Perferendis officiis ut non.",
            ].join("\n"),
        }),
    }),
    TABLE: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        return runGetNoteBlocks({
            engine,
            wsRoot,
            vaults,
            cb: ({ data }) => {
                return [
                    {
                        actual: data === null || data === void 0 ? void 0 : data.length,
                        expected: 3,
                    },
                ];
            },
        });
    }, {
        preSetupHook: (opts) => preSetupHook(opts, {
            noteBody: [
                "Et et quam culpa.",
                "",
                "| Sapiente | accusamus |",
                "|----------|-----------|",
                "| Laborum  | libero    |",
                "| Ullam    | optio     |",
                "",
                "Sequi ut non delectus tempore.",
            ].join("\n"),
        }),
    }),
    EXISTING_ANCHORS: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        return runGetNoteBlocks({
            engine,
            wsRoot,
            vaults,
            cb: ({ data }) => {
                var _a, _b, _c, _d, _e, _f, _g;
                return [
                    {
                        actual: data === null || data === void 0 ? void 0 : data.length,
                        expected: 7,
                    },
                    { actual: (_a = data[0].anchor) === null || _a === void 0 ? void 0 : _a.value, expected: "et-et-quam-culpa" },
                    { actual: (_b = data[1].anchor) === null || _b === void 0 ? void 0 : _b.value, expected: "paragraph" },
                    { actual: (_c = data[2].anchor) === null || _c === void 0 ? void 0 : _c.value, expected: "item1" },
                    { actual: (_d = data[3].anchor) === null || _d === void 0 ? void 0 : _d.value, expected: "item2" },
                    { actual: (_e = data[4].anchor) === null || _e === void 0 ? void 0 : _e.value, expected: "item3" },
                    { actual: (_f = data[5].anchor) === null || _f === void 0 ? void 0 : _f.value, expected: "list" },
                    { actual: (_g = data[6].anchor) === null || _g === void 0 ? void 0 : _g.value, expected: "table" },
                ];
            },
        });
    }, {
        preSetupHook: (opts) => preSetupHook(opts, {
            noteBody: [
                "# Et et quam culpa. ^header",
                "",
                "Ullam vel eius reiciendis. ^paragraph",
                "",
                "* Cumque molestiae qui deleniti. ^item1",
                "* Eius odit commodi harum. ^item2",
                "  * Sequi ut non delectus tempore. ^item3",
                "",
                "^list",
                "",
                "| Sapiente | accusamus |",
                "|----------|-----------|",
                "| Laborum  | libero    |",
                "| Ullam    | optio     | ^table",
            ].join("\n"),
        }),
    }),
    HEADERS_ONLY: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        return runGetNoteBlocks({
            engine,
            wsRoot,
            vaults,
            filterByAnchorType: "header",
            cb: ({ data }) => {
                var _a;
                return [
                    {
                        actual: data === null || data === void 0 ? void 0 : data.length,
                        expected: 1,
                    },
                    { actual: (_a = data[0].anchor) === null || _a === void 0 ? void 0 : _a.value, expected: "et-et-quam-culpa" },
                ];
            },
        });
    }, {
        preSetupHook: (opts) => preSetupHook(opts, {
            noteBody: [
                "# Et et quam culpa.",
                "",
                "Ullam vel eius reiciendis. ^paragraph",
                "",
                "* Cumque molestiae qui deleniti. ^item1",
                "* Eius odit commodi harum. ^item2",
                "  * Sequi ut non delectus tempore. ^item3",
                "",
                "^list",
                "",
                "| Sapiente | accusamus |",
                "|----------|-----------|",
                "| Laborum  | libero    |",
                "| Ullam    | optio     | ^table",
            ].join("\n"),
        }),
    }),
    BLOCK_ANCHORS_ONLY: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        return runGetNoteBlocks({
            engine,
            wsRoot,
            vaults,
            filterByAnchorType: "block",
            cb: ({ data }) => {
                var _a, _b, _c, _d, _e, _f;
                return [
                    {
                        actual: data === null || data === void 0 ? void 0 : data.length,
                        expected: 6,
                    },
                    { actual: (_a = data[0].anchor) === null || _a === void 0 ? void 0 : _a.value, expected: "paragraph" },
                    { actual: (_b = data[1].anchor) === null || _b === void 0 ? void 0 : _b.value, expected: "item1" },
                    { actual: (_c = data[2].anchor) === null || _c === void 0 ? void 0 : _c.value, expected: "item2" },
                    { actual: (_d = data[3].anchor) === null || _d === void 0 ? void 0 : _d.value, expected: "item3" },
                    { actual: (_e = data[4].anchor) === null || _e === void 0 ? void 0 : _e.value, expected: "list" },
                    { actual: (_f = data[5].anchor) === null || _f === void 0 ? void 0 : _f.value, expected: "table" },
                ];
            },
        });
    }, {
        preSetupHook: (opts) => preSetupHook(opts, {
            noteBody: [
                "# Et et quam culpa.",
                "",
                "Ullam vel eius reiciendis. ^paragraph",
                "",
                "* Cumque molestiae qui deleniti. ^item1",
                "* Eius odit commodi harum. ^item2",
                "  * Sequi ut non delectus tempore. ^item3",
                "",
                "^list",
                "",
                "| Sapiente | accusamus |",
                "|----------|-----------|",
                "| Laborum  | libero    |",
                "| Ullam    | optio     | ^table",
            ].join("\n"),
        }),
    }),
    HEADER: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        return runGetNoteBlocks({
            engine,
            wsRoot,
            vaults,
            cb: ({ data }) => {
                var _a, _b;
                return [
                    {
                        actual: data === null || data === void 0 ? void 0 : data.length,
                        expected: 4,
                    },
                    {
                        actual: (_a = data[0].anchor) === null || _a === void 0 ? void 0 : _a.value,
                        expected: "et-et-quam-culpa",
                    },
                    {
                        actual: (_b = data[2].anchor) === null || _b === void 0 ? void 0 : _b.value,
                        expected: "eius-odit-commodi-harum",
                    },
                ];
            },
        });
    }, {
        preSetupHook: (opts) => preSetupHook(opts, {
            noteBody: [
                "# Et et quam culpa. ^anchor",
                "",
                "Cumque molestiae qui deleniti.",
                "",
                "# Eius odit commodi harum.",
                "",
                "Sequi ut non delectus tempore.",
            ].join("\n"),
        }),
    }),
};
exports.ENGINE_GET_NOTE_BLOCKS_PRESETS = {
    // use the below to test a specific test
    NOTES: { NOTE_REF: NOTES["HEADERS_ONLY"] },
    //NOTES,
    SCHEMAS: {},
};
//# sourceMappingURL=getNoteBlocks.js.map