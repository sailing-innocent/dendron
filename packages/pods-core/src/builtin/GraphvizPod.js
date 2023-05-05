"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphvizExportPod = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const lodash_1 = __importDefault(require("lodash"));
const common_all_1 = require("@dendronhq/common-all");
const path_1 = __importDefault(require("path"));
const basev3_1 = require("../basev3");
const utils_1 = require("../utils");
const ID = "dendron.graphviz";
class GraphvizExportPod extends basev3_1.ExportPod {
    constructor() {
        super(...arguments);
        // Dashes are not allowed, so they are removed.
        // Initial numbers mess with rendering, so each entry is prefixed with "note"
        this.parseText = (s) => (s ? `note_${s.split("-").join("")}` : "");
    }
    get config() {
        return utils_1.PodUtils.createExportConfig({
            required: [],
            properties: {
                showGraphByHierarchy: {
                    type: "boolean",
                    description: "Include hierarchical note connections (e.g. parent -> child connections)",
                    default: true,
                },
                showGraphByEdges: {
                    type: "boolean",
                    description: "Include linked note relationships, e.g. note with [[link]] -> another note",
                    default: false,
                },
            },
        });
    }
    processNote(opts) {
        const { note, notes, connections, parentDictionary, showGraphByHierarchy, showGraphByEdges, } = opts;
        if (!note)
            return [connections, parentDictionary];
        const localConnections = [
            // Initial node with label
            `${this.parseText(note.id)} [label="${note.title}"]`,
        ];
        // Parent -> Child connection
        if (showGraphByHierarchy) {
            const parentID = parentDictionary[note.id];
            if (parentID) {
                localConnections.push(`${this.parseText(parentID)} -- ${this.parseText(note.id)}`);
            }
        }
        // Prepare Parent -> Child connection for this note's children
        note.children.forEach((child) => (parentDictionary[child] = note.id));
        const noteDicts = common_all_1.NoteDictsUtils.createNoteDicts(notes);
        // Note -> Linked Notes connections
        if (showGraphByEdges) {
            note.links.forEach((link) => {
                if (link.to) {
                    const destinationNote = common_all_1.NoteDictsUtils.findByFname({
                        fname: link.to.fname,
                        noteDicts,
                        vault: note.vault,
                    })[0];
                    if (!lodash_1.default.isUndefined(destinationNote)) {
                        if ((showGraphByEdges && !showGraphByHierarchy) ||
                            !note.children.includes(destinationNote.id)) {
                            localConnections.push(`${this.parseText(note.id)} -- ${this.parseText(destinationNote.id)} [style=dotted]`);
                        }
                    }
                }
            });
        }
        return [[...connections, ...localConnections], parentDictionary];
    }
    async plant(opts) {
        const { dest, notes, wsRoot, config } = opts;
        const { showGraphByHierarchy = true, showGraphByEdges = false } = config;
        // verify dest exist
        const podDstPath = dest.fsPath;
        try {
            fs_extra_1.default.ensureDirSync(podDstPath);
        }
        catch {
            await fs_extra_1.default.promises.mkdir(podDstPath, { recursive: true });
        }
        const [connections] = notes.reduce(([connections, dictionary], note) => {
            return this.processNote({
                note,
                notes,
                connections,
                parentDictionary: dictionary,
                wsRoot,
                showGraphByHierarchy,
                showGraphByEdges,
            });
        }, [[], {}]);
        // Create file output
        const graphvizOutput = `graph {
    ${connections.join(";\n\t")};
}`;
        // Write file
        const filePath = path_1.default.join(podDstPath, "graphviz.dot");
        fs_extra_1.default.writeFileSync(filePath, graphvizOutput);
        return { notes };
    }
}
GraphvizExportPod.id = ID;
GraphvizExportPod.description = "export notes in Graphviz DOT format";
exports.GraphvizExportPod = GraphvizExportPod;
//# sourceMappingURL=GraphvizPod.js.map