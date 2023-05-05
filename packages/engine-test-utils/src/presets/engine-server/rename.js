"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENGINE_RENAME_PRESETS = void 0;
const common_all_1 = require("@dendronhq/common-all");
const common_server_1 = require("@dendronhq/common-server");
const common_test_utils_1 = require("@dendronhq/common-test-utils");
const engine_server_1 = require("@dendronhq/engine-server");
const fs_extra_1 = __importDefault(require("fs-extra"));
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
const utils_1 = require("../../utils");
const findCreated = (changed) => {
    const created = lodash_1.default.find(changed, { status: "create" });
    return created;
};
const runRename = async ({ engine, vaults, wsRoot, numChanges, cb, noNameChange, }) => {
    const vault = vaults[0];
    const vaultName = common_all_1.VaultUtils.getName(vault);
    const oldLoc = { fname: "foo", vaultName };
    const newLoc = noNameChange ? oldLoc : { fname: "baz", vaultName };
    const changed = await engine.renameNote({
        oldLoc,
        newLoc,
    });
    const checkVaultMatch = noNameChange ? ["foo.md"] : ["baz.md"];
    const checkVaultNoMatch = noNameChange ? ["baz.md"] : ["foo.md"];
    const checkVault = await common_test_utils_1.FileTestUtils.assertInVault({
        wsRoot,
        vault,
        match: checkVaultMatch,
        nomatch: checkVaultNoMatch,
    });
    const barChange = lodash_1.default.find(changed.data, (ent) => ent.note.fname === "bar");
    const out = cb({ barChange, allChanged: changed.data });
    return out.concat([
        {
            actual: changed.data.length,
            expected: numChanges || 6,
        },
        {
            actual: checkVault,
            expected: true,
        },
    ]);
};
const preSetupHook = async ({ vaults, wsRoot }, { fooBody, barBody }) => {
    const vault = vaults[0];
    await common_test_utils_1.NOTE_PRESETS_V4.NOTE_SIMPLE.create({
        vault,
        wsRoot,
        body: fooBody || "",
    });
    await common_test_utils_1.NOTE_PRESETS_V4.NOTE_SIMPLE_OTHER.create({
        vault,
        wsRoot,
        body: barBody,
    });
};
const NOTES = {
    NO_UPDATE: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        return runRename({
            wsRoot,
            vaults,
            engine,
            numChanges: 1,
            cb: ({ barChange }) => {
                return [
                    {
                        actual: barChange,
                        expected: undefined,
                    },
                ];
            },
            noNameChange: true,
        });
    }, {
        preSetupHook: async ({ wsRoot, vaults }) => {
            await common_test_utils_1.NoteTestUtilsV4.createNote({
                fname: "foo",
                wsRoot,
                vault: vaults[0],
            });
            await common_test_utils_1.NoteTestUtilsV4.createNote({
                fname: "bar",
                wsRoot,
                vault: vaults[0],
                body: "[[foo]]",
            });
        },
    }),
    NO_UPDATE_NUMBER_IN_FM: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        return runRename({
            wsRoot,
            vaults,
            engine,
            numChanges: 1,
            cb: ({ barChange }) => {
                return [
                    {
                        actual: barChange,
                        expected: undefined,
                    },
                ];
            },
            noNameChange: true,
        });
    }, {
        preSetupHook: async ({ wsRoot, vaults }) => {
            await common_test_utils_1.NoteTestUtilsV4.createNote({
                fname: "foo",
                wsRoot,
                vault: vaults[0],
            });
            await common_test_utils_1.NoteTestUtilsV4.createNote({
                fname: "bar",
                wsRoot,
                vault: vaults[0],
                body: "[[foo]]",
                props: { title: "09" }, // testing for cases where frontmatter is read as number instead of string, which malforms the title
            });
        },
    }),
    NO_UPDATE_DOUBLE_QUOTE_IN_FM: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        return runRename({
            wsRoot,
            vaults,
            engine,
            numChanges: 1,
            cb: ({ barChange }) => {
                return [
                    {
                        actual: barChange,
                        expected: undefined,
                    },
                ];
            },
            noNameChange: true,
        });
    }, {
        preSetupHook: async ({ wsRoot, vaults }) => {
            await common_test_utils_1.NoteTestUtilsV4.createNote({
                fname: "foo",
                wsRoot,
                vault: vaults[0],
            });
            await common_test_utils_1.NoteTestUtilsV4.createNote({
                fname: "bar",
                wsRoot,
                vault: vaults[0],
                body: "[[foo]]",
                props: { title: '"wow"' }, // testing for cases where double quotes are unnecessarily changed to single quotes
            });
        },
    }),
    WITH_INLINE_CODE: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        return runRename({
            wsRoot,
            vaults,
            engine,
            numChanges: 4,
            cb: ({ barChange }) => {
                return [
                    {
                        actual: barChange,
                        expected: undefined,
                    },
                ];
            },
        });
    }, {
        preSetupHook: (opts) => preSetupHook(opts, { barBody: "`[[foo]]`" }),
    }),
    WITH_ALIAS: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        return runRename({
            wsRoot,
            vaults,
            engine,
            cb: ({ barChange }) => {
                return [
                    {
                        actual: lodash_1.default.trim(barChange === null || barChange === void 0 ? void 0 : barChange.note.body),
                        expected: "[[secret|baz]]",
                    },
                ];
            },
        });
    }, {
        preSetupHook: (opts) => preSetupHook(opts, { barBody: `[[secret|foo]]` }),
    }),
    UPDATES_DEFAULT_ALIAS: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        return runRename({
            wsRoot,
            vaults,
            engine,
            cb: ({ barChange }) => {
                return [
                    {
                        actual: lodash_1.default.trim(barChange === null || barChange === void 0 ? void 0 : barChange.note.body),
                        expected: "[[Baz|baz]]",
                    },
                ];
            },
        });
    }, {
        preSetupHook: (opts) => preSetupHook(opts, { barBody: `[[Foo|foo]]` }),
    }),
    MULTIPLE_LINKS: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        return runRename({
            wsRoot,
            vaults,
            engine,
            numChanges: 7,
            cb: ({ barChange }) => {
                return [
                    {
                        actual: lodash_1.default.trim(barChange === null || barChange === void 0 ? void 0 : barChange.note.body),
                        expected: "[[baz]] [[baz]]",
                    },
                ];
            },
        });
    }, {
        preSetupHook: (opts) => preSetupHook(opts, { barBody: `[[foo]] [[foo]]` }),
    }),
    XVAULT_LINK: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        return runRename({
            wsRoot,
            vaults,
            engine,
            cb: ({ barChange }) => {
                return [
                    {
                        actual: lodash_1.default.trim(barChange === null || barChange === void 0 ? void 0 : barChange.note.body),
                        expected: "[[dendron://vault1/baz#head1]]",
                    },
                ];
            },
        });
    }, {
        preSetupHook: (opts) => preSetupHook(opts, { barBody: `[[dendron://vault1/foo#head1]]` }),
    }),
    RELATIVE_LINK: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        return runRename({
            wsRoot,
            vaults,
            engine,
            cb: ({ barChange }) => {
                return [
                    {
                        actual: lodash_1.default.trim(barChange === null || barChange === void 0 ? void 0 : barChange.note.body),
                        expected: "[[baz#head1]]",
                    },
                ];
            },
        });
    }, {
        preSetupHook: (opts) => preSetupHook(opts, { barBody: `[[foo#head1]]` }),
    }),
    NOTE_REF: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        return runRename({
            wsRoot,
            vaults,
            engine,
            cb: ({ barChange }) => {
                return [
                    {
                        actual: lodash_1.default.trim(barChange === null || barChange === void 0 ? void 0 : barChange.note.body),
                        expected: "![[baz]]",
                    },
                ];
            },
        });
    }, {
        preSetupHook: (opts) => preSetupHook(opts, { barBody: `![[foo]]` }),
    }),
    NOTE_REF_WITH_HEADER: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        return runRename({
            wsRoot,
            vaults,
            engine,
            cb: ({ barChange }) => {
                return [
                    {
                        actual: lodash_1.default.trim(barChange === null || barChange === void 0 ? void 0 : barChange.note.body),
                        expected: "![[baz#header]]",
                    },
                ];
            },
        });
    }, {
        preSetupHook: (opts) => preSetupHook(opts, { barBody: `![[foo#header]]` }),
    }),
    NOTE_REF_WITH_ANCHOR: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        return runRename({
            wsRoot,
            vaults,
            engine,
            cb: ({ barChange }) => {
                return [
                    {
                        actual: lodash_1.default.trim(barChange === null || barChange === void 0 ? void 0 : barChange.note.body),
                        expected: "![[baz#^anchor-0-id-0]]",
                    },
                ];
            },
        });
    }, {
        preSetupHook: (opts) => preSetupHook(opts, { barBody: `![[foo#^anchor-0-id-0]]` }),
    }),
    NOTE_REF_WITH_RANGE: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        return runRename({
            wsRoot,
            vaults,
            engine,
            cb: ({ barChange }) => {
                return [
                    {
                        actual: lodash_1.default.trim(barChange === null || barChange === void 0 ? void 0 : barChange.note.body),
                        expected: "![[baz#start:#end]]",
                    },
                ];
            },
        });
    }, {
        preSetupHook: (opts) => preSetupHook(opts, { barBody: `![[foo#start:#end]]` }),
    }),
    NOTE_REF_WITH_RANGE_WILDCARD_OFFSET: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        return runRename({
            wsRoot,
            vaults,
            engine,
            cb: ({ barChange }) => {
                return [
                    {
                        actual: lodash_1.default.trim(barChange === null || barChange === void 0 ? void 0 : barChange.note.body),
                        expected: "![[baz#start,1:#*]]",
                    },
                ];
            },
        });
    }, {
        preSetupHook: (opts) => preSetupHook(opts, { barBody: `![[foo#start,1:#*]]` }),
    }),
    NOTE_REF_WITH_RANGE_BLOCK_ANCHOR: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        return runRename({
            wsRoot,
            vaults,
            engine,
            cb: ({ barChange }) => {
                return [
                    {
                        actual: lodash_1.default.trim(barChange === null || barChange === void 0 ? void 0 : barChange.note.body),
                        expected: "![[baz#^start:#^end]]",
                    },
                ];
            },
        });
    }, {
        preSetupHook: (opts) => preSetupHook(opts, { barBody: `![[foo#^start:#^end]]` }),
    }),
    // TODO: doesn't work in extension test wright now
    // no way to stub diff vault
    // SAME_NAME_DIFF_VAULT: new TestPresetEntryV4(
    //   async ({ wsRoot, vaults, engine }) => {
    //     const [vault1, vault2] = vaults;
    //     const alpha = NOTE_PRESETS_V4.NOTE_WITH_LINK.fname;
    //     const changed = await engine.renameNote({
    //       oldLoc: { fname: alpha, vault: vault1 },
    //       newLoc: { fname: alpha, vault: vault2 },
    //     });
    //     const checkVault = await FileTestUtils.assertInVault({
    //       wsRoot,
    //       vault: vault1,
    //       match: [],
    //       nomatch: [`${alpha}.md`],
    //     });
    //     return [
    //       {
    //         actual: changed.data?.length,
    //         expected: 3,
    //       },
    //       {
    //         actual: checkVault,
    //         expected: true,
    //       },
    //       {
    //         actual: await FileTestUtils.assertInVault({
    //           wsRoot,
    //           vault: vault2,
    //           match: [`${alpha}.md`],
    //           nomatch: [],
    //         }),
    //         expected: true,
    //       },
    //     ];
    //   },
    //   {
    //     preSetupHook: async ({ vaults, wsRoot }) => {
    //       const vault = vaults[0];
    //       await NOTE_PRESETS_V4.NOTE_WITH_TARGET.create({
    //         vault,
    //         wsRoot,
    //       });
    //       await NOTE_PRESETS_V4.NOTE_WITH_LINK.create({
    //         vault,
    //         wsRoot,
    //       });
    //     },
    //   }
    // ),
    RENAME_FOR_CACHE: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        var _a;
        const vault = vaults[0];
        const beta = common_test_utils_1.NOTE_PRESETS_V4.NOTE_WITH_LINK.fname;
        const changed = await engine.renameNote({
            oldLoc: { fname: beta, vaultName: common_all_1.VaultUtils.getName(vault) },
            newLoc: { fname: "gamma", vaultName: common_all_1.VaultUtils.getName(vault) },
        });
        const checkVault = await common_test_utils_1.FileTestUtils.assertInVault({
            wsRoot,
            vault,
            match: ["gamma.md"],
            nomatch: [`${beta}.md`],
        });
        await engine.init();
        const cachePath = path_1.default.join((0, common_server_1.vault2Path)({ wsRoot, vault }), common_all_1.CONSTANTS.DENDRON_CACHE_FILE);
        const notesCache = new engine_server_1.NotesFileSystemCache({
            cachePath,
            logger: engine.logger,
        });
        const keySet = notesCache.getCacheEntryKeys();
        return [
            {
                actual: (_a = changed.data) === null || _a === void 0 ? void 0 : _a.length,
                expected: 8,
            },
            {
                actual: lodash_1.default.trim(changed.data[1].note.body),
                expected: "[[gamma]]",
            },
            {
                actual: checkVault,
                expected: true,
            },
            {
                actual: keySet.size,
                expected: 3,
            },
            {
                actual: keySet.has("beta"),
                expected: false,
            },
            {
                actual: keySet.has("gamma"),
                expected: true,
            },
        ];
    }, {
        preSetupHook: async ({ vaults, wsRoot }) => {
            const vault = vaults[0];
            await common_test_utils_1.NOTE_PRESETS_V4.NOTE_WITH_TARGET.create({
                vault,
                wsRoot,
            });
            await common_test_utils_1.NOTE_PRESETS_V4.NOTE_WITH_LINK.create({
                vault,
                wsRoot,
            });
        },
    }),
    DOMAIN_NO_CHILDREN: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        var _a;
        const vault = vaults[0];
        const beta = common_test_utils_1.NOTE_PRESETS_V4.NOTE_WITH_LINK.fname;
        const alphaBefore = await engine.getNoteMeta(common_test_utils_1.NOTE_PRESETS_V4.NOTE_WITH_TARGET.fname);
        const alphaBackLinksBefore = alphaBefore.data.links.filter((link) => link.type === "backlink");
        const changed = await engine.renameNote({
            oldLoc: { fname: beta, vaultName: common_all_1.VaultUtils.getName(vault) },
            newLoc: { fname: "gamma", vaultName: common_all_1.VaultUtils.getName(vault) },
        });
        const alphaAfter = await engine.getNoteMeta(common_test_utils_1.NOTE_PRESETS_V4.NOTE_WITH_TARGET.fname);
        const alphaBackLinksAfter = alphaAfter.data.links.filter((link) => link.type === "backlink");
        const checkVault = await common_test_utils_1.FileTestUtils.assertInVault({
            wsRoot,
            vault,
            match: ["gamma.md"],
            nomatch: [`${beta}.md`],
        });
        return [
            {
                actual: (_a = changed.data) === null || _a === void 0 ? void 0 : _a.length,
                expected: 8,
            },
            {
                actual: lodash_1.default.trim(changed.data[1].note.body),
                expected: "[[gamma]]",
            },
            {
                actual: checkVault,
                expected: true,
            },
            {
                actual: alphaBackLinksBefore.length,
                expected: 1,
            },
            {
                actual: alphaBackLinksBefore[0].from.fname,
                expected: beta,
            },
            {
                actual: alphaBackLinksAfter.length,
                expected: 1,
            },
            {
                actual: alphaBackLinksAfter[0].from.fname,
                expected: "gamma",
            },
        ];
    }, {
        preSetupHook: async ({ vaults, wsRoot }) => {
            const vault = vaults[0];
            await common_test_utils_1.NOTE_PRESETS_V4.NOTE_WITH_TARGET.create({
                vault,
                wsRoot,
            });
            await common_test_utils_1.NOTE_PRESETS_V4.NOTE_WITH_LINK.create({
                vault,
                wsRoot,
            });
        },
    }),
    SINGLE_NOTE_DEEP_IN_DOMAIN: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        var _a;
        const vault = vaults[0];
        const origName = "baz.one.two";
        const newName = "baz.one.three";
        const changed = await engine.renameNote({
            oldLoc: { fname: origName, vaultName: common_all_1.VaultUtils.getName(vault) },
            newLoc: { fname: newName, vaultName: common_all_1.VaultUtils.getName(vault) },
        });
        const checkVault = await common_test_utils_1.FileTestUtils.assertInVault({
            wsRoot,
            vault,
            match: [newName],
            nomatch: [origName],
        });
        return [
            {
                actual: (_a = changed.data) === null || _a === void 0 ? void 0 : _a.length,
                expected: 8,
            },
            {
                actual: changed
                    .data.sort((a, b) => a.status.localeCompare(b.status))
                    .map((ent) => [ent.note.fname, ent.status]),
                expected: [
                    ["baz", "create"],
                    ["baz.one", "create"],
                    ["baz.one.three", "create"],
                    ["baz.one", "delete"],
                    ["baz", "delete"],
                    ["baz.one.two", "delete"],
                    ["root", "update"],
                    ["root", "update"],
                ],
            },
            {
                actual: checkVault,
                expected: true,
            },
        ];
    }, {
        preSetupHook: async ({ vaults, wsRoot }) => {
            const vault = vaults[0];
            await common_test_utils_1.NoteTestUtilsV4.createNote({
                fname: "baz.one.two",
                vault,
                wsRoot,
                genRandomId: false,
                body: "baz body",
            });
        },
    }),
    SCRATCH_NOTE: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        var _a;
        const vault = vaults[0];
        const alpha = "scratch.2020.02.03.0123";
        //const alpha = NOTE_PRESETS_V4.NOTE_WITH_LINK.fname;
        const notesInVaultBefore = await engine.findNotesMeta({ vault });
        const changed = await engine.renameNote({
            oldLoc: { fname: alpha, vaultName: common_all_1.VaultUtils.getName(vault) },
            newLoc: { fname: "gamma", vaultName: common_all_1.VaultUtils.getName(vault) },
        });
        const notesInVaultAfter = await engine.findNotesMeta({ vault });
        const checkVault = await common_test_utils_1.FileTestUtils.assertInVault({
            wsRoot,
            vault,
            match: ["gamma.md"],
            nomatch: [`${alpha}.md`],
        });
        return [
            // alpha deleted, gamma created
            {
                actual: (_a = changed.data) === null || _a === void 0 ? void 0 : _a.length,
                expected: 8,
            },
            // 6 notes in vault before
            {
                actual: lodash_1.default.size(notesInVaultBefore),
                expected: 6,
            },
            // 2 notes in vault after (gamma + root)
            {
                actual: lodash_1.default.size(notesInVaultAfter),
                expected: 2,
            },
            {
                actual: checkVault,
                expected: true,
            },
        ];
    }, {
        preSetupHook: async ({ vaults, wsRoot }) => {
            await common_test_utils_1.NoteTestUtilsV4.createNote({
                fname: "scratch.2020.02.03.0123",
                vault: vaults[0],
                wsRoot,
            });
        },
    }),
    DOMAIN_DIFF_TITLE: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        var _a;
        const vault = vaults[0];
        const fnameOld = common_test_utils_1.NOTE_PRESETS_V4.NOTE_WITH_TARGET.fname;
        const changed = await engine.renameNote({
            oldLoc: { fname: fnameOld, vaultName: common_all_1.VaultUtils.getName(vault) },
            newLoc: { fname: "gamma", vaultName: common_all_1.VaultUtils.getName(vault) },
        });
        const createdChange = findCreated(changed.data);
        const checkVault = await common_test_utils_1.FileTestUtils.assertInVault({
            wsRoot,
            vault,
            match: ["gamma.md"],
            nomatch: [`${fnameOld}.md`],
        });
        return [
            {
                actual: (_a = changed.data) === null || _a === void 0 ? void 0 : _a.length,
                expected: 8,
            },
            {
                actual: createdChange === null || createdChange === void 0 ? void 0 : createdChange.note.title,
                expected: "a title",
            },
            {
                actual: checkVault,
                expected: true,
            },
        ];
    }, {
        preSetupHook: async ({ vaults, wsRoot }) => {
            const vault = vaults[0];
            await common_test_utils_1.NOTE_PRESETS_V4.NOTE_WITH_TARGET.create({
                vault,
                wsRoot,
                props: { title: "a title" },
            });
            await common_test_utils_1.NOTE_PRESETS_V4.NOTE_WITH_LINK.create({
                vault,
                wsRoot,
            });
        },
    }),
    LINK_AT_ROOT: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        var _a;
        const vault = vaults[0];
        const fnameOld = common_test_utils_1.NOTE_PRESETS_V4.NOTE_WITH_TARGET.fname;
        const changed = await engine.renameNote({
            oldLoc: { fname: fnameOld, vaultName: common_all_1.VaultUtils.getName(vault) },
            newLoc: { fname: "gamma", vaultName: common_all_1.VaultUtils.getName(vault) },
        });
        const checkVault = await common_test_utils_1.FileTestUtils.assertInVault({
            wsRoot,
            vault,
            match: ["gamma.md"],
            nomatch: [`${fnameOld}.md`],
        });
        const changedNote = (await engine.findNotes({
            fname: "root",
            vault,
        }))[0];
        return [
            {
                actual: (_a = changed.data) === null || _a === void 0 ? void 0 : _a.length,
                expected: 6,
            },
            {
                actual: await common_test_utils_1.AssertUtils.assertInString({
                    body: changedNote === null || changedNote === void 0 ? void 0 : changedNote.body,
                    match: ["[[gamma]]"],
                }),
                expected: true,
            },
            {
                actual: checkVault,
                expected: true,
            },
        ];
    }, {
        preSetupHook: async ({ vaults, wsRoot }) => {
            const vault = vaults[0];
            await common_test_utils_1.NOTE_PRESETS_V4.NOTE_WITH_TARGET.create({
                vault,
                wsRoot,
            });
            const vpath = (0, common_server_1.vault2Path)({ vault, wsRoot });
            const root = path_1.default.join(vpath, "root.md");
            fs_extra_1.default.appendFileSync(root, "[[alpha]]");
        },
    }),
    TARGET_IN_VAULT1_AND_LINK_IN_VAULT2: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        const fnameTarget = common_test_utils_1.NOTE_PRESETS_V4.NOTE_WITH_TARGET.fname;
        const fnameNew = "gamma";
        const fnameLink = common_test_utils_1.NOTE_PRESETS_V4.NOTE_WITH_LINK.fname;
        const resp = await engine.renameNote({
            oldLoc: {
                fname: fnameTarget,
                vaultName: common_all_1.VaultUtils.getName(vaults[0]),
            },
            newLoc: { fname: fnameNew, vaultName: common_all_1.VaultUtils.getName(vaults[0]) },
        });
        const changed = resp.data;
        const updated = lodash_1.default.map(changed, (ent) => ({
            status: ent.status,
            fname: ent.note.fname,
        })).sort();
        const checkVault1 = await common_test_utils_1.FileTestUtils.assertInVault({
            vault: vaults[0],
            wsRoot,
            match: [fnameNew],
            nomatch: [fnameTarget],
        });
        const checkVault2 = await common_test_utils_1.FileTestUtils.assertInVault({
            vault: vaults[1],
            wsRoot,
            match: [fnameLink],
            nomatch: [fnameTarget, fnameNew],
        });
        return [
            {
                actual: updated,
                expected: [
                    { status: "update", fname: "root" },
                    { status: "update", fname: "beta" },
                    { status: "delete", fname: fnameTarget },
                    { status: "update", fname: "root" },
                    { status: "update", fname: "beta" },
                    { status: "create", fname: fnameNew },
                ],
            },
            {
                actual: checkVault1,
                expected: true,
            },
            {
                actual: checkVault2,
                expected: true,
            },
        ];
    }, {
        preSetupHook: async ({ vaults, wsRoot }) => {
            await common_test_utils_1.NOTE_PRESETS_V4.NOTE_WITH_TARGET.create({
                vault: vaults[0],
                wsRoot,
            });
            await common_test_utils_1.NOTE_PRESETS_V4.NOTE_WITH_LINK.create({
                vault: vaults[1],
                wsRoot,
            });
        },
    }),
    NOTE_REF_XVAULT: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        const resp = await engine.renameNote({
            oldLoc: {
                fname: "foo",
                vaultName: common_all_1.VaultUtils.getName(vaults[1]),
            },
            newLoc: {
                fname: "baz",
                vaultName: common_all_1.VaultUtils.getName(vaults[1]),
            },
        });
        const changed = resp.data;
        const updated = lodash_1.default.map(changed, (ent) => ({
            status: ent.status,
            fname: ent.note.fname,
        })).sort();
        const checkVault = await common_test_utils_1.FileTestUtils.assertInVault({
            vault: vaults[1],
            wsRoot,
            match: ["baz"],
            nomatch: ["foo"],
        });
        return [
            {
                actual: updated,
                expected: [
                    { status: "update", fname: "foo" },
                    { status: "update", fname: "bar" },
                    { status: "update", fname: "root" },
                    { status: "delete", fname: "foo" },
                    { status: "update", fname: "root" },
                    { status: "create", fname: "baz" },
                ],
            },
            {
                actual: lodash_1.default.trim(changed[1].note.body),
                expected: `![[dendron://${common_all_1.VaultUtils.getName(vaults[1])}/baz]]`,
            },
            {
                actual: checkVault,
                expected: true,
            },
        ];
    }, {
        preSetupHook: async ({ vaults, wsRoot }) => {
            await common_test_utils_1.NoteTestUtilsV4.createNote({
                wsRoot,
                fname: "bar",
                vault: vaults[0],
                body: `![[dendron://${common_all_1.VaultUtils.getName(vaults[1])}/foo]]`,
            });
            await common_test_utils_1.NoteTestUtilsV4.createNote({
                wsRoot,
                fname: "foo",
                vault: vaults[1],
                body: "Facilis repellat aliquam quas.",
            });
        },
    }),
    NOTE_REF_XVAULT_VAULT_CHANGE: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        const resp = await engine.renameNote({
            oldLoc: {
                fname: "foo",
                vaultName: common_all_1.VaultUtils.getName(vaults[1]),
            },
            newLoc: {
                fname: "baz",
                vaultName: common_all_1.VaultUtils.getName(vaults[2]),
            },
        });
        const changed = resp.data;
        const updated = lodash_1.default.map(changed, (ent) => ({
            status: ent.status,
            fname: ent.note.fname,
        })).sort();
        const checkVault = await common_test_utils_1.FileTestUtils.assertInVault({
            vault: vaults[2],
            wsRoot,
            match: ["baz"],
            nomatch: ["foo"],
        });
        return [
            {
                actual: updated,
                expected: [
                    { status: "update", fname: "foo" },
                    { status: "update", fname: "bar" },
                    { status: "update", fname: "root" },
                    { status: "delete", fname: "foo" },
                    // this is a diff vault
                    { status: "update", fname: "root" },
                    { status: "create", fname: "baz" },
                ],
            },
            {
                actual: lodash_1.default.trim(changed[1].note.body),
                expected: `![[dendron://${common_all_1.VaultUtils.getName(vaults[2])}/baz]]`,
            },
            {
                actual: checkVault,
                expected: true,
            },
        ];
    }, {
        preSetupHook: async ({ vaults, wsRoot }) => {
            await common_test_utils_1.NoteTestUtilsV4.createNote({
                wsRoot,
                fname: "bar",
                vault: vaults[0],
                body: `![[dendron://${common_all_1.VaultUtils.getName(vaults[1])}/foo]]`,
            });
            await common_test_utils_1.NoteTestUtilsV4.createNote({
                wsRoot,
                fname: "foo",
                vault: vaults[1],
                body: "Facilis repellat aliquam quas.",
            });
        },
    }),
    TARGET_IN_VAULT2_AND_LINK_IN_VAULT2: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        const fnameTarget = common_test_utils_1.NOTE_PRESETS_V4.NOTE_WITH_TARGET.fname;
        const fnameNew = "gamma";
        const fnameLink = common_test_utils_1.NOTE_PRESETS_V4.NOTE_WITH_LINK.fname;
        const resp = await engine.renameNote({
            oldLoc: {
                fname: fnameTarget,
                vaultName: common_all_1.VaultUtils.getName(vaults[1]),
            },
            newLoc: { fname: fnameNew, vaultName: common_all_1.VaultUtils.getName(vaults[1]) },
        });
        const changed = resp.data;
        const updated = lodash_1.default.map(changed, (ent) => ({
            status: ent.status,
            fname: ent.note.fname,
        })).sort();
        const checkVault1 = await common_test_utils_1.FileTestUtils.assertInVault({
            vault: vaults[0],
            wsRoot,
            nomatch: [fnameLink, fnameNew],
        });
        const checkVault2 = await common_test_utils_1.FileTestUtils.assertInVault({
            vault: vaults[1],
            wsRoot,
            match: [fnameLink, fnameNew],
            nomatch: [fnameTarget],
        });
        return [
            {
                actual: updated,
                expected: [
                    { status: "update", fname: "alpha" },
                    { status: "update", fname: "beta" },
                    { status: "update", fname: "root" },
                    { status: "update", fname: "beta" },
                    { status: "delete", fname: "alpha" },
                    { status: "update", fname: "root" },
                    { status: "update", fname: "beta" },
                    { status: "create", fname: "gamma" },
                ],
            },
            {
                actual: checkVault1,
                expected: true,
            },
            {
                actual: checkVault2,
                expected: true,
            },
        ];
    }, {
        preSetupHook: async ({ vaults, wsRoot }) => {
            await common_test_utils_1.NOTE_PRESETS_V4.NOTE_WITH_TARGET.create({
                vault: vaults[1],
                wsRoot,
            });
            await common_test_utils_1.NOTE_PRESETS_V4.NOTE_WITH_LINK.create({
                vault: vaults[1],
                wsRoot,
            });
        },
    }),
    TARGET_IN_VAULT2_AND_LINK_IN_VAULT1: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        const fnameTarget = common_test_utils_1.NOTE_PRESETS_V4.NOTE_WITH_TARGET.fname;
        const fnameNew = "gamma";
        const fnameLink = common_test_utils_1.NOTE_PRESETS_V4.NOTE_WITH_LINK.fname;
        const resp = await engine.renameNote({
            oldLoc: {
                fname: fnameTarget,
                vaultName: common_all_1.VaultUtils.getName(vaults[1]),
            },
            newLoc: { fname: fnameNew, vaultName: common_all_1.VaultUtils.getName(vaults[1]) },
        });
        const changed = resp.data;
        const updated = lodash_1.default.map(changed, (ent) => ({
            status: ent.status,
            fname: ent.note.fname,
        })).sort();
        const checkVault1 = await common_test_utils_1.FileTestUtils.assertInVault({
            vault: vaults[0],
            wsRoot,
            match: [fnameLink],
        });
        const checkVault2 = await common_test_utils_1.FileTestUtils.assertInVault({
            vault: vaults[1],
            wsRoot,
            match: [fnameNew],
            nomatch: [fnameTarget],
        });
        return [
            {
                actual: updated,
                expected: [
                    { status: "update", fname: "root" },
                    { status: "update", fname: "beta" },
                    { status: "delete", fname: "alpha" },
                    { status: "update", fname: "root" },
                    { status: "update", fname: "beta" },
                    { status: "create", fname: "gamma" },
                ],
            },
            {
                actual: checkVault1,
                expected: true,
            },
            {
                actual: checkVault2,
                expected: true,
            },
        ];
    }, {
        preSetupHook: async ({ vaults, wsRoot }) => {
            await common_test_utils_1.NOTE_PRESETS_V4.NOTE_WITH_TARGET.create({
                vault: vaults[1],
                wsRoot,
            });
            await common_test_utils_1.NOTE_PRESETS_V4.NOTE_WITH_LINK.create({
                vault: vaults[0],
                wsRoot,
            });
        },
    }),
    NOTE_WITHOUT_ID: new common_test_utils_1.TestPresetEntryV4(async ({ vaults, engine }) => {
        var _a;
        let error;
        try {
            const out = await engine.renameNote({
                oldLoc: {
                    fname: "tag.foo",
                    alias: "#foo",
                    vaultName: common_all_1.VaultUtils.getName(vaults[0]),
                },
                newLoc: {
                    fname: "tags.foo",
                    vaultName: common_all_1.VaultUtils.getName(vaults[0]),
                },
            });
            error = out.error;
        }
        catch (err) {
            // Need to check both `out.error` and caught error
            // since this runs in both API and engine tests
            error = err;
        }
        // Renaming a note without a frontmatter fails.
        // Make sure we fail gracefully.
        return [
            {
                actual: lodash_1.default.pick(error, "severity"),
                expected: { severity: "fatal" },
            },
            {
                actual: (_a = error === null || error === void 0 ? void 0 : error.message) === null || _a === void 0 ? void 0 : _a.includes("Unable to rename"),
                expected: true,
            },
        ];
    }, {
        preSetupHook: async ({ vaults, wsRoot }) => {
            // Create an empty file without a frontmatter.
            await fs_extra_1.default.writeFile(path_1.default.join(wsRoot, vaults[0].fsPath, "tag.foo.md"), "");
        },
    }),
    HASHTAG: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        await engine.renameNote({
            oldLoc: {
                fname: "tags.foo",
                alias: "#foo",
                vaultName: common_all_1.VaultUtils.getName(vaults[0]),
            },
            newLoc: { fname: "tags.bar", vaultName: common_all_1.VaultUtils.getName(vaults[0]) },
        });
        const note = (await engine.findNotesMeta({
            fname: "primary",
            vault: vaults[0],
        }))[0];
        const containsTag = (0, utils_1.checkFileNoExpect)({
            fpath: common_all_1.NoteUtils.getFullPath({ note: note, wsRoot }),
            match: ["#bar"],
            nomatch: ["#foo"],
        });
        return [
            {
                actual: containsTag,
                expected: true,
            },
        ];
    }, {
        preSetupHook: async ({ vaults, wsRoot }) => {
            await common_test_utils_1.NoteTestUtilsV4.createNote({
                fname: "tags.foo",
                vault: vaults[0],
                wsRoot,
            });
            await common_test_utils_1.NoteTestUtilsV4.createNote({
                fname: "primary",
                vault: vaults[0],
                wsRoot,
                body: "Lorem ipsum #foo dolor amet",
            });
        },
    }),
    USERTAG: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        await engine.renameNote({
            oldLoc: {
                fname: "user.foo",
                alias: "@foo",
                vaultName: common_all_1.VaultUtils.getName(vaults[0]),
            },
            newLoc: { fname: "user.bar", vaultName: common_all_1.VaultUtils.getName(vaults[0]) },
        });
        const note = (await engine.findNotesMeta({
            fname: "primary",
            vault: vaults[0],
        }))[0];
        const containsTag = (0, utils_1.checkFileNoExpect)({
            fpath: common_all_1.NoteUtils.getFullPath({ note: note, wsRoot }),
            match: ["@bar"],
            nomatch: ["@foo"],
        });
        return [
            {
                actual: containsTag,
                expected: true,
            },
        ];
    }, {
        preSetupHook: async ({ vaults, wsRoot }) => {
            await common_test_utils_1.NoteTestUtilsV4.createNote({
                fname: "user.foo",
                vault: vaults[0],
                wsRoot,
            });
            await common_test_utils_1.NoteTestUtilsV4.createNote({
                fname: "primary",
                vault: vaults[0],
                wsRoot,
                body: "Lorem ipsum @foo dolor amet",
            });
        },
    }),
    FRONTMATTER_TAG_SINGLE: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        await engine.renameNote({
            oldLoc: {
                fname: "tags.foo",
                vaultName: common_all_1.VaultUtils.getName(vaults[0]),
            },
            newLoc: { fname: "tags.bar", vaultName: common_all_1.VaultUtils.getName(vaults[0]) },
        });
        const note = (await engine.findNotesMeta({
            fname: "primary",
            vault: vaults[0],
        }))[0];
        const containsTag = (0, utils_1.checkFileNoExpect)({
            fpath: common_all_1.NoteUtils.getFullPath({ note: note, wsRoot }),
            match: ["tags: bar"],
            nomatch: ["tags: foo"],
        });
        return [
            {
                actual: note === null || note === void 0 ? void 0 : note.tags,
                expected: "bar",
            },
            {
                actual: containsTag,
                expected: true,
            },
        ];
    }, {
        preSetupHook: async ({ vaults, wsRoot }) => {
            await common_test_utils_1.NoteTestUtilsV4.createNote({
                fname: "tags.foo",
                vault: vaults[0],
                wsRoot,
            });
            await common_test_utils_1.NoteTestUtilsV4.createNote({
                fname: "primary",
                vault: vaults[0],
                wsRoot,
                props: {
                    tags: "foo",
                },
            });
        },
    }),
    FRONTMATTER_TAG_MULTI: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        await engine.renameNote({
            oldLoc: {
                fname: "tags.foo",
                vaultName: common_all_1.VaultUtils.getName(vaults[0]),
            },
            newLoc: { fname: "tags.bar", vaultName: common_all_1.VaultUtils.getName(vaults[0]) },
        });
        const note = (await engine.findNotesMeta({
            fname: "primary",
            vault: vaults[0],
        }))[0];
        const containsTag = (0, utils_1.checkFileNoExpect)({
            fpath: common_all_1.NoteUtils.getFullPath({ note: note, wsRoot }),
            match: ["bar"],
            nomatch: ["foo"],
        });
        return [
            {
                actual: note === null || note === void 0 ? void 0 : note.tags,
                expected: ["head", "bar", "tail"],
            },
            {
                actual: containsTag,
                expected: true,
            },
        ];
    }, {
        preSetupHook: async ({ vaults, wsRoot }) => {
            await common_test_utils_1.NoteTestUtilsV4.createNote({
                fname: "tags.foo",
                vault: vaults[0],
                wsRoot,
            });
            await common_test_utils_1.NoteTestUtilsV4.createNote({
                fname: "primary",
                vault: vaults[0],
                wsRoot,
                props: {
                    tags: ["head", "foo", "tail"],
                },
            });
        },
    }),
    FRONTMATTER_TAG_SINGLE_REMOVE: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        await engine.renameNote({
            oldLoc: {
                fname: "tags.foo",
                vaultName: common_all_1.VaultUtils.getName(vaults[0]),
            },
            newLoc: { fname: "bar", vaultName: common_all_1.VaultUtils.getName(vaults[0]) },
        });
        const note = (await engine.findNotesMeta({
            fname: "primary",
            vault: vaults[0],
        }))[0];
        const containsTag = (0, utils_1.checkFileNoExpect)({
            fpath: common_all_1.NoteUtils.getFullPath({ note: note, wsRoot }),
            nomatch: [
                "tags: foo",
                "tags: bar",
                "tags: undefined",
                'tags: "undefined"',
            ],
        });
        return [
            {
                actual: note === null || note === void 0 ? void 0 : note.tags,
                expected: undefined,
            },
            {
                actual: containsTag,
                expected: true,
            },
        ];
    }, {
        preSetupHook: async ({ vaults, wsRoot }) => {
            await common_test_utils_1.NoteTestUtilsV4.createNote({
                fname: "tags.foo",
                vault: vaults[0],
                wsRoot,
            });
            await common_test_utils_1.NoteTestUtilsV4.createNote({
                fname: "primary",
                vault: vaults[0],
                wsRoot,
                props: {
                    tags: "foo",
                },
            });
        },
    }),
    FRONTMATTER_TAG_MULTI_REMOVE: new common_test_utils_1.TestPresetEntryV4(async ({ wsRoot, vaults, engine }) => {
        await engine.renameNote({
            oldLoc: {
                fname: "tags.foo",
                vaultName: common_all_1.VaultUtils.getName(vaults[0]),
            },
            newLoc: { fname: "bar", vaultName: common_all_1.VaultUtils.getName(vaults[0]) },
        });
        const note = (await engine.findNotesMeta({
            fname: "primary",
            vault: vaults[0],
        }))[0];
        const containsTag = (0, utils_1.checkFileNoExpect)({
            fpath: common_all_1.NoteUtils.getFullPath({ note: note, wsRoot }),
            nomatch: ["foo", "bar", "undefined"],
        });
        return [
            {
                actual: note === null || note === void 0 ? void 0 : note.tags,
                expected: ["head", "tail"],
            },
            {
                actual: containsTag,
                expected: true,
            },
        ];
    }, {
        preSetupHook: async ({ vaults, wsRoot }) => {
            await common_test_utils_1.NoteTestUtilsV4.createNote({
                fname: "tags.foo",
                vault: vaults[0],
                wsRoot,
            });
            await common_test_utils_1.NoteTestUtilsV4.createNote({
                fname: "primary",
                vault: vaults[0],
                wsRoot,
                props: {
                    tags: ["head", "foo", "tail"],
                },
            });
        },
    }),
    // TODO: need a way of adding findlinks to this test
    /**
     * - pre:init
     *    - note A without body
     * - post:init
     *    - note A is updated with link to note B
     *    - note B is written
     *    - note B is re-written
     * - expect
     *    - note A should be updated
     */
    // DOMAIN_NO_CHILDREN_V3: new TestPresetEntryV4(
    //   async ({ vaults, engine }) => {
    //     const vault = vaults[0];
    //     const alphaFname = NOTE_PRESETS_V4.NOTE_WITH_TARGET.fname;
    //     const noteOrig = (
    //      await engine.findNotes({
    //        fname: "alphaFname",
    //        vault,
    //      })
    //    )[0];
    //   let alphaNoteNew = NoteUtils.create({
    //     fname: "alpha",
    //     id: "alpha",
    //     created: 1
    //     updated: 1
    //     body: "[[beta]]",
    //     vault,
    //   });
    //   const links = ParserUtilsV2.findLinks({ note: alpha });
    //   alpha.links = links;
    //   await engine.updateNote(alphaNoteNew);
    //     // const changed = await engine.renameNote({
    //     //   oldLoc: { fname: alpha, vault },
    //     //   newLoc: { fname: "gamma", vault },
    //     // });
    //     // const checkVault = await FileTestUtils.assertInVault({
    //     //   wsRoot,
    //     //   vault,
    //     //   match: ["gamma.md"],
    //     //   nomatch: [`${alpha}.md`],
    //     // });
    //     return [
    //       {
    //         actual: _.trim(noteOrig?.body),
    //         expected: "",
    //       },
    //     ];
    //   },
    //   {
    //     preSetupHook: async ({ vaults, wsRoot }) => {
    //       const vault = vaults[0];
    //       await NOTE_PRESETS_V4.NOTE_WITH_TARGET.create({
    //         vault,
    //         wsRoot,
    //         body: "",
    //       });
    //       await NOTE_PRESETS_V4.NOTE_WITH_LINK.create({
    //         vault,
    //         wsRoot,
    //       });
    //     },
    //   }
    // ),
    // TODO: currently , new nodes not picked up by refactor
    // DOMAIN_NO_CHILDREN_POST_INIT: new TestPresetEntryV4(
    //   async ({ wsRoot, vaults, engine }) => {
    //     const vault = vaults[0];
    //     const alphaNote = await NOTE_PRESETS_V4.NOTE_WITH_TARGET.create({
    //       vault,
    //       wsRoot,
    //       noWrite: true,
    //     });
    //     const betaNote = await NOTE_PRESETS_V4.NOTE_WITH_LINK.create({
    //       vault,
    //       wsRoot,
    //       noWrite: true,
    //     });
    //     await engine.writeNote(alphaNote);
    //     await engine.writeNote(betaNote);
    //     const alpha = alphaNote.fname;
    //     const changed = await engine.renameNote({
    //       oldLoc: { fname: alpha, vault },
    //       newLoc: { fname: "gamma", vault },
    //     });
    //     const checkVault = await FileTestUtils.assertInVault({
    //       wsRoot,
    //       vault,
    //       match: ["gamma.md"],
    //       nomatch: [`${alpha}.md`],
    //     });
    //     return [
    //       {
    //         actual: changed.data?.length,
    //         expected: 2,
    //       },
    //       {
    //         actual: _.trim((changed.data as NoteChangeEntry[])[0].note.body),
    //         expected: "[[gamma]]",
    //       },
    //       {
    //         actual: checkVault,
    //         expected: true,
    //       },
    //     ];
    //   }
    // ),
    NOTE_WITH_STUB_CHILD: new common_test_utils_1.TestPresetEntryV4(async ({ vaults, engine }) => {
        var _a;
        const vaultName = common_all_1.VaultUtils.getName(vaults[0]);
        const out = await engine.renameNote({
            oldLoc: {
                fname: "foo",
                vaultName,
            },
            newLoc: {
                fname: "foo1",
                vaultName,
            },
        });
        const changedEntries = out.data;
        const fooStub = (_a = changedEntries === null || changedEntries === void 0 ? void 0 : changedEntries.find((entry) => {
            return entry.status === "create" && entry.note.fname === "foo";
        })) === null || _a === void 0 ? void 0 : _a.note;
        const root = (await engine.findNotesMeta({
            fname: "root",
            vault: vaults[0],
        }))[0];
        const fooChild = (await engine.findNotesMeta({
            fname: "foo.bar",
            vault: vaults[0],
        }))[0];
        return [
            {
                actual: fooStub === null || fooStub === void 0 ? void 0 : fooStub.stub,
                expected: true,
            },
            {
                actual: (await engine.getNoteMeta("foo")).data.fname,
                expected: "foo1",
            },
            {
                actual: changedEntries && changedEntries.length === 6,
                expected: true,
            },
            {
                // root's children is now the replacing stub and renamed note
                actual: root.children.length === 2,
                expected: true,
            },
            {
                // children's parent points to replaced stub
                actual: fooChild.parent,
                expected: fooStub === null || fooStub === void 0 ? void 0 : fooStub.id,
            },
        ];
    }, {
        preSetupHook: async ({ vaults, wsRoot }) => {
            await common_test_utils_1.NoteTestUtilsV4.createNote({
                fname: "foo",
                vault: vaults[0],
                wsRoot,
            });
            await common_test_utils_1.NoteTestUtilsV4.createNote({
                fname: "foo.bar.baz",
                vault: vaults[0],
                wsRoot,
            });
        },
    }),
};
exports.ENGINE_RENAME_PRESETS = {
    // use the below to test a specific test
    //NOTES: {NOTE_REF: NOTES["NOTE_REF"]},
    NOTES,
    SCHEMAS: {},
};
//# sourceMappingURL=rename.js.map