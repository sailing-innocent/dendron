"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoteCLICommand = exports.NoteCommands = exports.NoteCLIOutput = void 0;
const common_all_1 = require("@dendronhq/common-all");
const common_server_1 = require("@dendronhq/common-server");
const pods_core_1 = require("@dendronhq/pods-core");
const lodash_1 = __importDefault(require("lodash"));
const base_1 = require("./base");
const utils_1 = require("./utils");
var NoteCLIOutput;
(function (NoteCLIOutput) {
    NoteCLIOutput["JSON"] = "json";
    NoteCLIOutput["MARKDOWN_GFM"] = "md_gfm";
    NoteCLIOutput["MARKDOWN_DENDRON"] = "md_dendron";
})(NoteCLIOutput = exports.NoteCLIOutput || (exports.NoteCLIOutput = {}));
var NoteCommands;
(function (NoteCommands) {
    /**
     * Like lookup, but only look for notes.
     * Returns a list of notes
     */
    NoteCommands["LOOKUP"] = "lookup";
    /**
     * Get note by id.
     */
    NoteCommands["GET"] = "get";
    /**
     * Find note by note properties.
     */
    NoteCommands["FIND"] = "find";
    /**
     * Find or create a note. Uses old engineV2/storeV2
     */
    NoteCommands["LOOKUP_LEGACY"] = "lookup_legacy";
    /**
     * Delete note by fname and vault.
     */
    NoteCommands["DELETE"] = "delete";
    /**
     * Move a note to another vault, or rename a note within a workspace.
     */
    NoteCommands["MOVE"] = "move";
    /**
     * Create or update a note by fname and vault.
     */
    NoteCommands["WRITE"] = "write";
})(NoteCommands = exports.NoteCommands || (exports.NoteCommands = {}));
function checkQuery(opts) {
    if (lodash_1.default.isUndefined(opts.query)) {
        throw Error("no query found");
    }
    return opts.query;
}
function checkVault(opts) {
    const vaults = opts.engine.vaults;
    if (lodash_1.default.size(vaults) > 1 && !opts.vault) {
        throw Error("need to specify vault");
    }
    else {
        return opts.vault
            ? common_all_1.VaultUtils.getVaultByNameOrThrow({ vaults, vname: opts.vault })
            : vaults[0];
    }
}
function checkFname(opts) {
    if (lodash_1.default.isUndefined(opts.fname)) {
        throw Error("no fname found");
    }
    return opts.fname;
}
async function formatNotes({ output, notes, engine, }) {
    const resp = await Promise.all(lodash_1.default.map(notes, (note) => {
        return formatNote({ note, output, engine });
    }));
    if (output === NoteCLIOutput.JSON) {
        return JSON.stringify(resp, null, 4);
    }
    return resp.join("\n");
}
async function formatNote({ output, note, engine, }) {
    let payload;
    switch (output) {
        case NoteCLIOutput.JSON:
            // this is a NOP
            payload = note;
            break;
        case NoteCLIOutput.MARKDOWN_DENDRON:
            payload = common_all_1.NoteUtils.serialize(note);
            break;
        case NoteCLIOutput.MARKDOWN_GFM:
            payload = await new pods_core_1.MarkdownPublishPod().execute({
                engine,
                vaults: engine.vaults,
                wsRoot: engine.wsRoot,
                config: {
                    fname: note.fname,
                    vaultName: common_all_1.VaultUtils.getName(note.vault),
                    dest: "stdout",
                },
            });
            break;
        case undefined:
            throw new common_all_1.DendronError({
                message: "Unknown output format requested",
                payload: {
                    ctx: "NoteCLICommand.execute",
                    output,
                },
            });
        default:
            (0, common_all_1.assertUnreachable)(output);
    }
    return payload;
}
class NoteCLICommand extends base_1.CLICommand {
    constructor() {
        super({ name: "note <cmd>", desc: "note related commands" });
    }
    buildArgs(args) {
        super.buildArgs(args);
        (0, utils_1.setupEngineArgs)(args);
        args.positional("cmd", {
            describe: "a command to run",
            choices: Object.values(NoteCommands),
            type: "string",
        });
        args.option("query", {
            describe: "the query to run",
            type: "string",
        });
        args.option("output", {
            describe: "format to output in",
            type: "string",
            choices: Object.values(NoteCLIOutput),
            default: NoteCLIOutput.JSON,
        });
        args.option("fname", {
            describe: "name of file to find/write",
            type: "string",
        });
        args.option("body", {
            describe: "body of file to write",
            type: "string",
        });
        args.option("destFname", {
            describe: "name to change to (for move)",
            type: "string",
        });
        args.option("destVaultName", {
            describe: "vault to move to (for move)",
            type: "string",
        });
    }
    async enrichArgs(args) {
        this.addArgsToPayload({ cmd: args.cmd, output: args.output });
        // TODO remove after migration to new engine
        if (args.cmd !== NoteCommands.LOOKUP_LEGACY) {
            args.newEngine = true;
        }
        const engineArgs = await (0, utils_1.setupEngine)(args);
        return { data: { ...args, ...engineArgs } };
    }
    async execute(opts) {
        const { cmd, engine, output, destFname, destVaultName, body } = lodash_1.default.defaults(opts, {
            output: NoteCLIOutput.JSON,
        });
        try {
            switch (cmd) {
                case NoteCommands.LOOKUP: {
                    const query = checkQuery(opts);
                    const notes = await common_all_1.NoteLookupUtils.lookup({ qsRaw: query, engine });
                    const resp = await formatNotes({
                        output,
                        notes,
                        engine,
                    });
                    this.print(resp);
                    const data = {
                        notesOutput: notes,
                        stringOutput: resp,
                    };
                    return { data };
                }
                case NoteCommands.GET: {
                    const query = checkQuery(opts);
                    const note = await engine.getNote(query);
                    if (note.data) {
                        const resp = await formatNotes({
                            output,
                            notes: [note.data],
                            engine,
                        });
                        this.print(resp);
                        const data = {
                            notesOutput: [note.data],
                            stringOutput: resp,
                        };
                        return { data };
                    }
                    else {
                        return {
                            error: common_all_1.ErrorFactory.create404Error({
                                url: query,
                            }),
                            data: undefined,
                        };
                    }
                }
                case NoteCommands.FIND: {
                    const maybeVault = opts.vault
                        ? common_all_1.VaultUtils.getVaultByNameOrThrow({
                            vaults: engine.vaults,
                            vname: opts.vault,
                        })
                        : undefined;
                    const notes = await engine.findNotes({
                        fname: opts.fname,
                        vault: maybeVault,
                    });
                    const resp = await formatNotes({
                        output,
                        notes,
                        engine,
                    });
                    this.print(resp);
                    const data = {
                        notesOutput: notes,
                        stringOutput: resp,
                    };
                    return { data };
                }
                case NoteCommands.LOOKUP_LEGACY: {
                    const query = checkQuery(opts);
                    const vault = checkVault(opts);
                    const notes = await engine.findNotes({ fname: query, vault });
                    let note;
                    // If note doesn't exist, create note with schema
                    if (notes.length === 0) {
                        note = await common_all_1.NoteUtils.createWithSchema({
                            noteOpts: {
                                fname: query,
                                vault,
                            },
                            engine,
                        });
                        // Until we support user prompt, pick template note for them if there are multiple matches in order of
                        // 1. Template note that lies in same vault as note to lookup
                        // 2. First note in list
                        await common_server_1.TemplateUtils.findAndApplyTemplate({
                            note,
                            engine,
                            pickNote: async (choices) => {
                                const sameVaultNote = choices.find((ent) => {
                                    return common_all_1.VaultUtils.isEqual(vault, ent.vault, engine.wsRoot);
                                });
                                if (sameVaultNote) {
                                    return { data: sameVaultNote };
                                }
                                else {
                                    return { data: choices[0] };
                                }
                            },
                        });
                        const resp = await engine.writeNote(note);
                        if (resp.error) {
                            return {
                                error: common_all_1.ErrorFactory.createInvalidStateError({
                                    message: "lookup failed",
                                }),
                                data: undefined,
                            };
                        }
                    }
                    else {
                        note = notes[0];
                        // If note exists and its a stub note, delete stub and create new note
                        if (note.stub) {
                            delete note.stub;
                            const resp = await engine.writeNote(note);
                            if (resp.error) {
                                return {
                                    error: common_all_1.ErrorFactory.createInvalidStateError({
                                        message: "lookup failed",
                                    }),
                                    data: undefined,
                                };
                            }
                        }
                    }
                    const stringOutput = await formatNotes({
                        engine,
                        notes: [note],
                        output,
                    });
                    this.print(stringOutput);
                    return {
                        data: {
                            notesOutput: [note],
                            stringOutput,
                        },
                    };
                }
                case NoteCommands.WRITE: {
                    const fname = checkFname(opts);
                    const vault = checkVault(opts);
                    const notes = await engine.findNotes({ fname, vault });
                    let note;
                    let status;
                    // If note doesn't exist, create new note
                    if (notes.length === 0) {
                        note = common_all_1.NoteUtils.create({ fname, vault, body });
                        status = "CREATE";
                    }
                    else {
                        // If note exists, update note body
                        const newBody = body || "";
                        note = { ...notes[0], body: newBody };
                        status = "UPDATE";
                    }
                    const resp = await engine.writeNote(note);
                    if (resp.error) {
                        return {
                            error: common_all_1.ErrorFactory.createInvalidStateError({
                                message: `write failed: ${resp.error.message}`,
                            }),
                            data: undefined,
                        };
                    }
                    else {
                        this.print(`wrote ${note.fname}`);
                        return {
                            data: { payload: note.fname, rawData: resp, status },
                        };
                    }
                }
                case NoteCommands.DELETE: {
                    const fname = checkFname(opts);
                    const vault = checkVault(opts);
                    const note = (await engine.findNotes({ fname, vault }))[0];
                    if (note) {
                        const resp = await engine.deleteNote(note.id);
                        if (resp.error) {
                            return {
                                error: common_all_1.ErrorFactory.createInvalidStateError({
                                    message: `delete failed: ${resp.error.message}`,
                                }),
                                data: undefined,
                            };
                        }
                        else {
                            this.print(`deleted ${note.fname}`);
                            return { data: { payload: note.fname, rawData: resp } };
                        }
                    }
                    else {
                        return {
                            error: common_all_1.ErrorFactory.createInvalidStateError({
                                message: `note ${fname} not found`,
                            }),
                            data: undefined,
                        };
                    }
                }
                case NoteCommands.MOVE: {
                    const fname = checkFname(opts);
                    const vault = checkVault(opts);
                    const note = (await engine.findNotes({
                        fname,
                        vault,
                    }))[0];
                    if (note) {
                        const oldLoc = common_all_1.NoteUtils.toNoteLoc(note);
                        const newLoc = {
                            fname: destFname || oldLoc.fname,
                            vaultName: destVaultName || oldLoc.vaultName,
                        };
                        const destVault = common_all_1.VaultUtils.getVaultByName({
                            vname: destVaultName || oldLoc.fname,
                            vaults: engine.vaults,
                        });
                        const noteExists = (await engine.findNotes({
                            fname: destFname || fname,
                            vault: destVault || vault,
                        }))[0];
                        const isStub = noteExists === null || noteExists === void 0 ? void 0 : noteExists.stub;
                        if (noteExists && !isStub) {
                            const vaultName = common_all_1.VaultUtils.getName(noteExists.vault);
                            const errMsg = `${vaultName}/${fname} exists`;
                            throw Error(errMsg);
                        }
                        const resp = await engine.renameNote({ oldLoc, newLoc });
                        return { data: { payload: note.fname, rawData: resp } };
                    }
                    else {
                        throw new common_all_1.DendronError({ message: `note ${fname} not found` });
                    }
                }
                default: {
                    throw Error("bad option");
                }
            }
        }
        finally {
            if (opts.server.close) {
                opts.server.close();
            }
        }
    }
}
exports.NoteCLICommand = NoteCLICommand;
//# sourceMappingURL=notes.js.map