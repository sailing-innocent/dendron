"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.string2Note = void 0;
const gray_matter_1 = __importDefault(require("gray-matter"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const lodash_1 = __importDefault(require("lodash"));
const dnode_1 = require("../dnode");
const types_1 = require("../types");
const utils_1 = require("../utils");
/**
 * NOTE: Temporarily duplicated from common-server/filesv2.ts to get Dendron Web
 * Extension working
 * @param calculateHash - when set, add `contentHash` property to the note
 *  Default: false
 * @returns
 */
function string2Note({ content, fname, vault, calculateHash, }) {
    const options = {
        engines: {
            yaml: {
                parse: (s) => js_yaml_1.default.load(s),
                stringify: (s) => js_yaml_1.default.dump(s),
            },
        },
    };
    const { data, content: body } = (0, gray_matter_1.default)(content, options);
    if (data === null || data === void 0 ? void 0 : data.title)
        data.title = lodash_1.default.toString(data.title);
    if (data === null || data === void 0 ? void 0 : data.id)
        data.id = lodash_1.default.toString(data.id);
    const custom = dnode_1.DNodeUtils.getCustomProps(data);
    const contentHash = calculateHash ? (0, utils_1.genHash)(content) : undefined;
    const note = dnode_1.DNodeUtils.create({
        ...lodash_1.default.omit(data, Object.values(types_1.DNodeImplicitPropsEnum)),
        custom,
        fname,
        body,
        type: "note",
        vault,
        contentHash,
    });
    // Any note parsed from a real string cannot be a stub - stubs are only
    // virtual notes to fill in hierarchy gaps. Just omit the property - the value
    // defaults to 'false'
    return lodash_1.default.omit(note, "stub");
}
exports.string2Note = string2Note;
//# sourceMappingURL=string2Note.js.map