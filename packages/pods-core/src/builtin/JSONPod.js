"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JSONExportPod = exports.JSONPublishPod = exports.JSONImportPod = void 0;
const common_all_1 = require("@dendronhq/common-all");
const fs_extra_1 = __importDefault(require("fs-extra"));
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
const basev3_1 = require("../basev3");
const utils_1 = require("../utils");
const ID = "dendron.json";
class JSONImportPod extends basev3_1.ImportPod {
    get config() {
        return utils_1.PodUtils.createImportConfig({
            required: [],
            properties: {},
        });
    }
    async plant(opts) {
        const ctx = "JSONPod";
        const { engine, vault, src } = opts;
        this.L.info({ ctx, msg: "enter", src: src.fsPath });
        const { destName, concatenate } = opts.config;
        const entries = fs_extra_1.default.readJSONSync(src.fsPath);
        const notes = await this._entries2Notes(entries, {
            vault,
            destName,
            concatenate,
        });
        await Promise.all(lodash_1.default.map(notes, (n) => engine.writeNote(n)));
        return { importedNotes: notes };
    }
    async _entries2Notes(entries, opts) {
        const { vault } = opts;
        const notes = lodash_1.default.map(entries, (ent) => {
            if (!ent.fname) {
                throw Error("fname not defined");
            }
            const fname = ent.fname;
            return common_all_1.NoteUtils.create({ ...ent, fname, vault });
        });
        if (opts.concatenate) {
            if (!opts.destName) {
                throw Error("destname needs to be specified if concatenate is set to true");
            }
            const acc = [""];
            lodash_1.default.forEach(notes, (n) => {
                acc.push(`# [[${n.fname}]]`);
                acc.push(n.body);
                acc.push("---");
            });
            return [
                common_all_1.NoteUtils.create({
                    fname: opts.destName,
                    body: acc.join("\n"),
                    vault,
                }),
            ];
        }
        else {
            return notes;
        }
    }
}
JSONImportPod.id = ID;
JSONImportPod.description = "import json";
exports.JSONImportPod = JSONImportPod;
class JSONPublishPod extends basev3_1.PublishPod {
    get config() {
        return utils_1.PodUtils.createPublishConfig({
            required: [],
            properties: {},
        });
    }
    async plant(opts) {
        const note = opts.note;
        const out = JSON.stringify(note, null, 4);
        return out;
    }
}
JSONPublishPod.id = ID;
JSONPublishPod.description = "publish json";
exports.JSONPublishPod = JSONPublishPod;
class JSONExportPod extends basev3_1.ExportPod {
    get config() {
        return utils_1.PodUtils.createExportConfig({
            required: [],
            properties: {},
        });
    }
    async plant(opts) {
        const { dest, notes } = opts;
        // verify dest exist
        const podDstPath = dest.fsPath;
        fs_extra_1.default.ensureDirSync(path_1.default.dirname(podDstPath));
        fs_extra_1.default.writeJSONSync(podDstPath, notes, { encoding: "utf8" });
        return { notes };
    }
}
JSONExportPod.id = ID;
JSONExportPod.description = "export notes as json";
exports.JSONExportPod = JSONExportPod;
//# sourceMappingURL=JSONPod.js.map