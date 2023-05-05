"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
const utils_1 = require("../../utils");
const UPDATE_ITEMS = {
    SCHEMA_SUGGESTION: new utils_1.TestPresetEntry({
        label: "schema suggestion",
        beforeTestResults: async ({ vault }) => {
            fs_extra_1.default.removeSync(path_1.default.join(vault.fsPath, "foo.ch1.md"));
        },
        results: async ({ items }) => {
            const schemaItem = lodash_1.default.pick(lodash_1.default.find(items, { fname: "foo.ch1" }), [
                "fname",
                "schemaStub",
            ]);
            return [
                {
                    actual: schemaItem,
                    expected: {
                        fname: "foo.ch1",
                        schemaStub: true,
                    },
                },
            ];
        },
    }),
};
const ACCEPT_ITEMS = {
    EXISTING_ITEM: new utils_1.TestPresetEntry({
        label: "existing item",
        results: async ({ activeFileName, activeNote, }) => {
            return [
                {
                    actual: activeFileName,
                    expected: "foo",
                },
                {
                    actual: lodash_1.default.pick(activeNote, ["title", "created"]),
                    expected: {
                        title: "Foo",
                        created: 1,
                    },
                },
            ];
        },
    }),
};
const LOOKUP_SINGLE_TEST_PRESET = {
    UPDATE_ITEMS,
    ACCEPT_ITEMS,
};
exports.default = LOOKUP_SINGLE_TEST_PRESET;
//# sourceMappingURL=lookup-single.js.map