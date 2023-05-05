"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrbitImportPod = void 0;
const basev3_1 = require("../basev3");
const utils_1 = require("../utils");
const common_all_1 = require("@dendronhq/common-all");
const axios_1 = __importDefault(require("axios"));
const lodash_1 = __importDefault(require("lodash"));
const ID = "dendron.orbit";
class OrbitImportPod extends basev3_1.ImportPod {
    constructor() {
        super(...arguments);
        /**
         * method to fetch all the members for an orbit workspace
         * @param opts
         * @returns members
         */
        this.getMembersFromOrbit = async (opts) => {
            const { token, workspaceSlug } = opts;
            let { link } = opts;
            link =
                link.length > 0
                    ? link
                    : `https://app.orbit.love/api/v1/${workspaceSlug}/members?items=100`;
            const headers = {
                Authorization: `Bearer ${token}`,
            };
            const members = [];
            let next = null;
            try {
                const response = await axios_1.default.get(link, { headers });
                response.data.data.forEach((member) => {
                    const attributes = member.attributes;
                    const { id, name, github, discord, linkedin, twitter, hn, website, email, } = attributes;
                    members.push({
                        name,
                        github,
                        discord,
                        linkedin,
                        twitter,
                        hn,
                        website,
                        orbitId: id,
                        email,
                    });
                    next = response.data.links.next;
                });
            }
            catch (error) {
                throw new common_all_1.DendronError({
                    message: (0, common_all_1.stringifyError)(error),
                    severity: common_all_1.ERROR_SEVERITY.MINOR,
                });
            }
            return { members, next };
        };
        /**
         * returns all the conflicted entries in custom.social FM field of note
         */
        this.getConflictedData = (opts) => {
            const { note, social } = opts;
            const customKeys = Object.keys(social);
            return customKeys.filter((key) => {
                return (note.custom.social[key] !== null &&
                    social[key] !== note.custom.social[key]);
            });
        };
        /**
         * updates the social fields of a note's FM
         */
        this.updateNoteData = async (opts) => {
            const { note, social, engine } = opts;
            const customKeys = Object.keys(social);
            let shouldUpdate = false;
            customKeys.forEach((key) => {
                var _a;
                if (((_a = note.custom) === null || _a === void 0 ? void 0 : _a.social[key]) === null &&
                    social[key] !== null) {
                    note.custom.social[key] = social[key];
                    shouldUpdate = true;
                }
            });
            if (shouldUpdate) {
                await engine.writeNote(note);
            }
        };
    }
    get config() {
        return utils_1.PodUtils.createImportConfig({
            required: ["workspaceSlug", "token"],
            properties: {
                token: {
                    type: "string",
                    description: "orbit personal access token",
                },
                workspaceSlug: {
                    type: "string",
                    description: "slug of workspace to import from",
                },
            },
        });
    }
    /**
     * method to parse members as notes.
     * - creates new noteprops if note is not already there in the vault
     * - writes in a temporary hierarchy if the note is conflicted
     * - updates previously imported notes if there are no conflicts
     */
    async membersToNotes(opts) {
        const { vault, members, engine, config } = opts;
        const conflicts = [];
        const create = [];
        const notesToUpdate = [];
        await (0, common_all_1.asyncLoopOneAtATime)(members, async (member) => {
            const { github, discord, twitter } = member;
            const { name, email, orbitId, ...social } = member;
            if (lodash_1.default.values({ ...social, email }).every((val) => lodash_1.default.isNull(val) || lodash_1.default.isUndefined(val))) {
                this.L.error({ ctx: "memberToNotes", member });
            }
            else {
                let noteName = name || github || discord || twitter || this.getNameFromEmail(email);
                noteName = (0, common_all_1.cleanName)(noteName);
                this.L.debug({ ctx: "membersToNotes", msg: "enter", member });
                let fname;
                const note = (await engine.findNotes({ fname: `people.${noteName}`, vault }))[0];
                if (!lodash_1.default.isUndefined(note)) {
                    const conflictData = this.getConflictedData({ note, social });
                    if (conflictData.length > 0) {
                        fname = `people.orbit.duplicate.${common_all_1.Time.now().toFormat("y.MM.dd")}.${noteName}`;
                        conflicts.push({
                            conflictNote: note,
                            conflictEntry: common_all_1.NoteUtils.create({
                                fname,
                                vault,
                                custom: { ...config.frontmatter, orbitId, social },
                            }),
                            conflictData,
                        });
                    }
                    else {
                        notesToUpdate.push({ note, social, engine });
                    }
                }
                else {
                    fname = `people.${noteName}`;
                    create.push(common_all_1.NoteUtils.create({
                        fname,
                        vault,
                        custom: {
                            ...config.frontmatter,
                            orbitId,
                            social,
                        },
                    }));
                }
            }
        });
        await Promise.all(notesToUpdate.map(({ note, social, engine }) => {
            return this.updateNoteData({ note, social, engine });
        }));
        return { create, conflicts };
    }
    getNameFromEmail(email) {
        return email.split("@")[0];
    }
    async onConflict(opts) {
        const { conflicts, handleConflict, engine, conflictResolvedNotes, conflictResolveOpts, } = opts;
        let { index } = opts;
        const conflict = conflicts[index];
        const resp = await handleConflict(conflict, conflictResolveOpts);
        switch (resp) {
            case common_all_1.MergeConflictOptions.OVERWRITE_LOCAL: {
                conflict.conflictEntry.fname = conflict.conflictNote.fname;
                await engine.writeNote(conflict.conflictEntry);
                break;
            }
            case common_all_1.MergeConflictOptions.SKIP:
                break;
            case common_all_1.MergeConflictOptions.SKIP_ALL:
                index = conflicts.length;
                break;
            default: {
                break;
            }
        }
        if (index < conflicts.length - 1) {
            return this.onConflict({
                conflicts,
                engine,
                index: index + 1,
                handleConflict,
                conflictResolvedNotes,
                conflictResolveOpts,
            });
        }
        else {
            return conflictResolvedNotes;
        }
    }
    validateMergeConflictResponse(choice, options) {
        if (options[choice]) {
            return true;
        }
        else {
            return "Invalid Choice! Choose 0/1";
        }
    }
    getMergeConflictOptions() {
        return [
            common_all_1.MergeConflictOptions.OVERWRITE_LOCAL,
            common_all_1.MergeConflictOptions.SKIP,
            common_all_1.MergeConflictOptions.SKIP_ALL,
        ];
    }
    getMergeConflictText(conflict) {
        let conflictentries = "";
        conflict.conflictData.forEach((key) => {
            conflictentries = conflictentries.concat(`\n${key}: \nremote: ${conflict.conflictEntry.custom.social[key]}\nlocal: ${conflict.conflictNote.custom.social[key]}\n`);
        });
        return `\nWe noticed different fields for user ${conflict.conflictNote.title} in the note: ${conflict.conflictNote.fname}. ${conflictentries}\n`;
    }
    async plant(opts) {
        const ctx = "OrbitImportPod";
        this.L.info({ ctx, msg: "enter" });
        const { vault, config, engine, wsRoot, utilityMethods } = opts;
        const { token, workspaceSlug } = config;
        let next = "";
        let members = [];
        while (next !== null) {
            const result = await this.getMembersFromOrbit({
                token,
                workspaceSlug,
                link: next,
            });
            members = [...members, ...result.members];
            next = result.next;
        }
        const { create, conflicts } = await this.membersToNotes({
            members,
            vault,
            engine,
            wsRoot,
            config,
        });
        const conflictNoteArray = conflicts.map((conflict) => conflict.conflictNote);
        this.L.debug({
            ctx: "createdAndConflictedNotes",
            created: create.length,
            conflicted: conflicts.length,
        });
        await engine.bulkWriteNotes({ notes: create, skipMetadata: true });
        const { handleConflict } = utilityMethods;
        const conflictResolveOpts = {
            options: this.getMergeConflictOptions,
            message: this.getMergeConflictText,
            validate: this.validateMergeConflictResponse,
        };
        const conflictResolvedNotes = conflicts.length > 0
            ? await this.onConflict({
                conflicts,
                handleConflict,
                engine,
                index: 0,
                conflictResolvedNotes: conflictNoteArray,
                conflictResolveOpts,
            })
            : [];
        return { importedNotes: [...create, ...conflictResolvedNotes] };
    }
}
OrbitImportPod.id = ID;
OrbitImportPod.description = "import orbit workspace members";
exports.OrbitImportPod = OrbitImportPod;
//# sourceMappingURL=OrbitPod.js.map