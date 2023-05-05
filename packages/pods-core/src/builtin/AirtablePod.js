"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AirtableExportPod = exports.AirtablePublishPod = exports.AirtableUtils = exports.SpecialSrcFieldToKey = void 0;
const airtable_1 = __importDefault(require("@dendronhq/airtable"));
const common_all_1 = require("@dendronhq/common-all");
const common_server_1 = require("@dendronhq/common-server");
const engine_server_1 = require("@dendronhq/engine-server");
const fs_extra_1 = __importDefault(require("fs-extra"));
const limiter_1 = require("limiter");
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
const basev3_1 = require("../basev3");
const utils_1 = require("../utils");
const ID = "dendron.airtable";
// Allow 5 req/sec. Also understands 'hour', 'minute', 'day', or a no. of ms
// @ts-ignore
const limiter = new limiter_1.RateLimiter({ tokensPerInterval: 5, interval: "second" });
var SpecialSrcFieldToKey;
(function (SpecialSrcFieldToKey) {
    SpecialSrcFieldToKey["TAGS"] = "tags";
    SpecialSrcFieldToKey["LINKS"] = "links";
})(SpecialSrcFieldToKey = exports.SpecialSrcFieldToKey || (exports.SpecialSrcFieldToKey = {}));
class AirtableUtils {
    static addRequiredFields(mapping) {
        const _map = { ...mapping };
        _map["DendronId"] = { type: "string", to: "id" };
        return _map;
    }
    static filterNotes(notes, srcHierarchy) {
        return notes.filter((note) => note.fname.includes(srcHierarchy));
    }
    static getAirtableIdFromNote(note, podId) {
        const airtableId = lodash_1.default.get(note.custom, "airtableId");
        if (airtableId) {
            return airtableId;
        }
        else {
            if (!podId) {
                return undefined;
            }
            const airtableMetadata = lodash_1.default.get(note.custom, "pods.airtable");
            return airtableMetadata ? airtableMetadata[podId] : undefined;
        }
    }
    /***
     * Chunk all calls into records of 10 (Airtable API limit and call using limiter)
     */
    static async chunkAndCall(allRecords, func) {
        const chunks = lodash_1.default.chunk(allRecords, 10);
        // let total: number = 0;
        const out = await Promise.all(chunks.flatMap(async (record) => {
            var _a;
            // @ts-ignore
            await limiter.removeTokens(1);
            const data = JSON.stringify({ records: record });
            try {
                const _records = await func(record);
                // total += _records.length;
                return _records;
            }
            catch (error) {
                let payload = { data };
                let _error;
                if (common_all_1.ErrorUtils.isAxiosError(error)) {
                    payload = error.toJSON();
                    if (((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) &&
                        error.response.status === common_all_1.StatusCodes.UNPROCESSABLE_ENTITY) {
                        payload = lodash_1.default.merge(payload, error.response.data);
                        _error = new common_all_1.DendronError({
                            message: error.response.data.message,
                            payload,
                            severity: common_all_1.ERROR_SEVERITY.MINOR,
                        });
                    }
                    else {
                        _error = new common_all_1.DendronError({ message: "axios error", payload });
                    }
                }
                else {
                    payload = lodash_1.default.merge(payload, error);
                    _error = new common_all_1.DendronError({ message: "general error", payload });
                }
                throw _error;
            }
        }));
        return lodash_1.default.flatten(out);
    }
    /**
     * Maps a {@linkk SrcFieldMappingV2["type"]} to a field on {@link NoteProps}
     * @param param0
     * @returns
     */
    static async handleSrcField({ fieldMapping, note, engine, }) {
        const { type, to: key, ...props } = fieldMapping;
        switch (type) {
            case "string": {
                return engine_server_1.NoteMetadataUtils.extractString({ note, key, ...props });
            }
            case "boolean": {
                return engine_server_1.NoteMetadataUtils.extractBoolean({
                    note,
                    key,
                    ...props,
                });
            }
            case "number": {
                return engine_server_1.NoteMetadataUtils.extractNumber({
                    note,
                    key,
                    ...props,
                });
            }
            case "date": {
                return engine_server_1.NoteMetadataUtils.extractDate({ note, key, ...props });
            }
            case "singleSelect": {
                if (fieldMapping.to === SpecialSrcFieldToKey.TAGS) {
                    const { error, data } = engine_server_1.NoteMetadataUtils.extractSingleTag({
                        note,
                        filters: fieldMapping.filter ? [fieldMapping.filter] : [],
                    });
                    if (error) {
                        return { error };
                    }
                    return { data: engine_server_1.NoteMetadataUtils.cleanTags(data ? [data] : [])[0] };
                }
                else {
                    return engine_server_1.NoteMetadataUtils.extractString({
                        note,
                        key,
                        ...props,
                    });
                }
            }
            case "multiSelect": {
                if (fieldMapping.to === SpecialSrcFieldToKey.TAGS) {
                    const tags = engine_server_1.NoteMetadataUtils.extractTags({
                        note,
                        filters: fieldMapping.filter ? [fieldMapping.filter] : [],
                    });
                    const data = engine_server_1.NoteMetadataUtils.cleanTags(tags);
                    return { data };
                }
                const data = engine_server_1.NoteMetadataUtils.extractArray({
                    note,
                    key: fieldMapping.to,
                });
                return { data };
            }
            case "linkedRecord": {
                const links = engine_server_1.NoteMetadataUtils.extractLinks({
                    note,
                    filters: fieldMapping.filter ? [fieldMapping.filter] : [],
                });
                const { vaults } = engine;
                const notesWithNoIds = [];
                const recordIds = await Promise.all(links.map(async (l) => {
                    if (lodash_1.default.isUndefined(l.to)) {
                        return;
                    }
                    const { fname, vaultName } = l.to;
                    if (lodash_1.default.isUndefined(fname)) {
                        return;
                    }
                    const vault = vaultName
                        ? common_all_1.VaultUtils.getVaultByName({ vaults, vname: vaultName })
                        : undefined;
                    const _notes = await engine.findNotesMeta({ fname, vault });
                    const _recordIds = _notes
                        .map((n) => {
                        const id = AirtableUtils.getAirtableIdFromNote(n, fieldMapping.podId);
                        return {
                            note: n,
                            id,
                        };
                    })
                        .filter((ent) => {
                        const { id, note } = ent;
                        const missingId = (0, common_all_1.isFalsy)(id);
                        if (missingId) {
                            notesWithNoIds.push(note);
                        }
                        return !missingId;
                    });
                    return _recordIds;
                }));
                if (notesWithNoIds.length > 0) {
                    return {
                        error: common_all_1.ErrorFactory.createInvalidStateError({
                            message: `The following notes are missing airtable ids: ${notesWithNoIds
                                .map((n) => common_all_1.NoteUtils.toNoteLocString(n))
                                .join(", ")}`,
                        }),
                    };
                }
                // if notesWithNoIds.length > 0 is false, then all records have ids
                return {
                    data: recordIds
                        .flat()
                        .filter(common_all_1.isNotUndefined)
                        .map((ent) => ent.id),
                };
            }
            default:
                return {
                    error: new common_all_1.DendronError({
                        message: `The type ${type} provided in srcFieldMapping is invalid. Please check the valid types here: https://wiki.dendron.so/notes/oTW7BFzKIlOd6iQnnNulg.html#sourcefieldmapping and update the pod config by running Dendron: Configure Export Pod V2 command.`,
                        severity: common_all_1.ERROR_SEVERITY.MINOR,
                    }),
                };
        }
    }
    /**
     * Maps note props to airtable calls.
     * For existing notes, checks for `airtableId` prop to see if we need to run an update vs a create
     *
     * @param opts
     * @returns
     */
    static async notesToSrcFieldMap(opts) {
        const { notes, srcFieldMapping, logger, engine, podId } = opts;
        const ctx = "notesToSrc";
        const recordSets = {
            create: [],
            update: [],
            lastCreated: -1,
            lastUpdated: -1,
        };
        const errors = [];
        await (0, common_all_1.asyncLoopOneAtATime)(notes, async (note) => {
            // TODO: optimize, don't parse if no hashtags
            let fields = {};
            logger.debug({ ctx, note: common_all_1.NoteUtils.toLogObj(note), msg: "enter" });
            await (0, common_all_1.asyncLoopOneAtATime)(Object.entries(srcFieldMapping), async (entry) => {
                var _a;
                const [key, fieldMapping] = entry;
                // handle legacy mapping
                if (lodash_1.default.isString(fieldMapping)) {
                    const val = (_a = lodash_1.default.get(note, `${fieldMapping}`)) !== null && _a !== void 0 ? _a : lodash_1.default.get(note.custom, `${fieldMapping}`);
                    if (!lodash_1.default.isUndefined(val)) {
                        fields = {
                            ...fields,
                            [key]: val.toString(),
                        };
                    }
                }
                else {
                    const resp = await this.handleSrcField({
                        fieldMapping,
                        note,
                        engine,
                    });
                    if (resp.error) {
                        errors.push(resp.error);
                    }
                    const val = resp.data;
                    if (!lodash_1.default.isUndefined(val)) {
                        fields = {
                            ...fields,
                            [key]: val,
                        };
                    }
                }
            });
            const airtableId = AirtableUtils.getAirtableIdFromNote(note, podId);
            if (airtableId) {
                logger.debug({ ctx, noteId: note.id, msg: "updating" });
                recordSets.update.push({
                    fields,
                    id: airtableId,
                });
            }
            else {
                logger.debug({ ctx, noteId: note.id, msg: "creating" });
                recordSets.create.push({ fields });
            }
            if (note.created > recordSets.lastCreated) {
                recordSets.lastCreated = note.created;
            }
            if (note.updated > recordSets.lastUpdated) {
                recordSets.lastCreated = note.updated;
            }
            logger.debug({ ctx, noteId: note.id, msg: "exit" });
            return;
        });
        if (!lodash_1.default.isEmpty(errors)) {
            return { error: new common_all_1.DendronCompositeError(errors) };
        }
        return { data: recordSets };
    }
    static async updateAirtableIdForNewlySyncedNotes({ records, engine, logger, podId, }) {
        if (!podId)
            return;
        const out = await Promise.all(records.map(async (ent) => {
            const airtableId = ent.id;
            const dendronId = ent.fields["DendronId"];
            const resp = await engine.getNote(dendronId);
            if (!resp.data) {
                return undefined;
            }
            const note = resp.data;
            let pods = lodash_1.default.get(note.custom, "pods");
            // return if the note is already exported for this pod Id
            if (pods && pods.airtable && pods.airtable[podId])
                return undefined;
            // if this is the first time a pod metadata is added to the note, add airtable pod metadata under pods namespace
            if (!pods) {
                pods = {
                    airtable: {
                        [podId]: airtableId,
                    },
                };
            }
            else if (pods.airtable) {
                // if airtable namespace is already present in frontmatter, update hashmap with podId: airtableId
                pods.airtable[podId] = airtableId;
            }
            else {
                // else update pods hashmap with airtable namespace for the newly exported record
                pods = {
                    ...pods,
                    airtable: {
                        [podId]: airtableId,
                    },
                };
            }
            const updatedNote = {
                ...note,
                custom: { ...note.custom, pods },
            };
            const out = await engine.writeNote(updatedNote);
            return out;
        }));
        logger.info({
            msg: `${out.filter((n) => !lodash_1.default.isUndefined(n)).length} notes updated`,
        });
    }
}
exports.AirtableUtils = AirtableUtils;
class AirtablePublishPod extends basev3_1.PublishPod {
    get config() {
        return utils_1.PodUtils.createPublishConfig({
            required: ["tableName", "baseId", "apiKey", "srcFieldMapping"],
            properties: {
                tableName: { type: "string", description: "Name of the airtable" },
                apiKey: {
                    type: "string",
                    description: "Api key for airtable",
                },
                baseId: {
                    type: "string",
                    description: " base Id of airtable base",
                },
                srcFieldMapping: {
                    type: "object",
                    description: "mapping of airtable fields with the note eg: {Created On: created, Notes: body}",
                },
            },
        });
    }
    async plant(opts) {
        const { config, note, engine } = opts;
        const { apiKey, baseId, tableName, srcFieldMapping } = config;
        const logger = (0, common_server_1.createLogger)("AirtablePublishPod");
        const resp = await AirtableUtils.notesToSrcFieldMap({
            notes: [note],
            srcFieldMapping,
            logger,
            engine,
        });
        if (resp.error) {
            throw resp.error;
        }
        const { update, create } = resp.data;
        const base = new airtable_1.default({ apiKey }).base(baseId);
        if (!lodash_1.default.isEmpty(update)) {
            const out = await base(tableName).update(update);
            return out[0].getId();
        }
        else {
            const created = await base(tableName).create(create);
            await AirtableUtils.updateAirtableIdForNewlySyncedNotes({
                records: created,
                engine,
                logger,
            });
            return created[0].getId();
        }
    }
}
AirtablePublishPod.id = ID;
AirtablePublishPod.description = "publish to airtable";
exports.AirtablePublishPod = AirtablePublishPod;
class AirtableExportPod extends basev3_1.ExportPod {
    get config() {
        return utils_1.PodUtils.createExportConfig({
            required: [
                "tableName",
                "srcHierarchy",
                "baseId",
                "apiKey",
                "srcFieldMapping",
            ],
            properties: {
                tableName: { type: "string", description: "Name of the airtable" },
                srcHierarchy: {
                    type: "string",
                    description: "The src .md file from where to start the sync",
                },
                apiKey: {
                    type: "string",
                    description: "Api key for airtable",
                },
                baseId: {
                    type: "string",
                    description: " base Id of airtable base",
                },
                noCheckpointing: {
                    type: "boolean",
                    description: "turn off checkpointing",
                },
                srcFieldMapping: {
                    type: "object",
                    description: "mapping of airtable fields with the note eg: {Created On: created, Notes: body}",
                },
            },
        });
    }
    async processNote(opts) {
        const { filteredNotes, apiKey, baseId, tableName, checkpoint, srcFieldMapping, engine, } = opts;
        const resp = await AirtableUtils.notesToSrcFieldMap({
            notes: filteredNotes,
            srcFieldMapping,
            logger: this.L,
            engine,
        });
        if (resp.error) {
            throw resp.error;
        }
        const { update, create, lastCreated } = resp.data;
        const base = new airtable_1.default({ apiKey }).base(baseId);
        const createRequest = lodash_1.default.isEmpty(create)
            ? []
            : await AirtableUtils.chunkAndCall(create, base(tableName).create);
        const updateRequest = lodash_1.default.isEmpty(update)
            ? []
            : await AirtableUtils.chunkAndCall(update, base(tableName).update);
        if (checkpoint) {
            fs_extra_1.default.writeFileSync(checkpoint, lastCreated.toString(), {
                encoding: "utf8",
            });
        }
        return { created: createRequest, updated: updateRequest };
    }
    verifyDir(dest) {
        const basePath = path_1.default.dirname(dest.fsPath);
        const checkpoint = path_1.default.join(basePath, "pods", ID, "airtable-pod.lastupdate", "checkpoint.txt");
        fs_extra_1.default.ensureDirSync(path_1.default.dirname(checkpoint));
        return checkpoint;
    }
    //filters the notes of src hierarchy given from all the notes
    filterNotes(notes, srcHierarchy) {
        return notes.filter((note) => note.fname.includes(srcHierarchy));
    }
    async plant(opts) {
        const { notes, config, dest, engine } = opts;
        const { apiKey, baseId, tableName, srcFieldMapping: srcFieldMappingRaw, srcHierarchy, noCheckpointing, } = config;
        const ctx = "plant";
        const checkpoint = this.verifyDir(dest);
        const srcFieldMapping = AirtableUtils.addRequiredFields(srcFieldMappingRaw);
        let filteredNotes = srcHierarchy === "root"
            ? notes
            : AirtableUtils.filterNotes(notes, srcHierarchy);
        filteredNotes = lodash_1.default.orderBy(filteredNotes, ["created"], ["asc"]);
        // unless disabled, only process notes that haven't already been processed
        if (!noCheckpointing) {
            if (fs_extra_1.default.existsSync(checkpoint)) {
                const lastUpdatedTimestamp = Number(fs_extra_1.default.readFileSync(checkpoint, { encoding: "utf8" }));
                filteredNotes = filteredNotes.filter((note) => note.created > lastUpdatedTimestamp);
            }
        }
        if (filteredNotes.length > 0) {
            const { created, updated } = await this.processNote({
                filteredNotes,
                apiKey,
                baseId,
                tableName,
                srcFieldMapping,
                srcHierarchy,
                checkpoint,
                engine,
            });
            await AirtableUtils.updateAirtableIdForNewlySyncedNotes({
                records: created,
                engine,
                logger: this.L,
            });
            this.L.info({
                ctx,
                created: created.length,
                updated: updated.length,
                msg: "finish export",
            });
            return { notes, data: { created, updated } };
        }
        else {
            throw new common_all_1.DendronError({
                message: "No new Records to sync in selected hierarchy. Create new file and then try",
            });
        }
    }
}
AirtableExportPod.id = ID;
AirtableExportPod.description = "export notes to airtable";
exports.AirtableExportPod = AirtableExportPod;
//# sourceMappingURL=AirtablePod.js.map