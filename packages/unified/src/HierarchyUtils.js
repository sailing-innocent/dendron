"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HierarchyUtils = void 0;
const lodash_1 = __importDefault(require("lodash"));
class HierarchyUtils {
}
/**
 * Get children of current note
 * @param opts.skipLevels: how many levels to skip for child
 * @returns
 */
HierarchyUtils.getChildren = (opts) => {
    const { skipLevels, note, notes } = opts;
    let children = note.children
        .map((id) => notes[id])
        .filter((ent) => !lodash_1.default.isUndefined(ent));
    let acc = 0;
    while (acc !== skipLevels) {
        children = children
            .flatMap((ent) => ent.children.map((id) => notes[id]))
            .filter((ent) => !lodash_1.default.isUndefined(ent));
        acc += 1;
    }
    return children;
};
exports.HierarchyUtils = HierarchyUtils;
//# sourceMappingURL=HierarchyUtils.js.map