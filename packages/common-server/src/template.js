"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateUtils = void 0;
const common_all_1 = require("@dendronhq/common-all");
const handlebars_1 = __importDefault(require("handlebars"));
const lodash_1 = __importDefault(require("lodash"));
function copyTemplateProps({ templateNote, targetNote, }) {
    const tempNoteProps = lodash_1.default.pick(templateNote, TemplateUtils.TEMPLATE_COPY_PROPS);
    lodash_1.default.forEach(tempNoteProps, (v, k) => {
        if (k === "custom" && v) {
            if (targetNote.custom === undefined)
                targetNote.custom = {};
            Object.keys(v).forEach((key) => {
                // @ts-ignore
                targetNote["custom"][key] = targetNote["custom"][key] || v[key];
            });
        }
        else {
            // @ts-ignore
            targetNote[k] = v;
        }
    });
    return targetNote;
}
function addOrAppendTemplateBody({ targetNote, templateBody, }) {
    if (targetNote.body) {
        targetNote.body += `\n${templateBody}`;
    }
    else {
        targetNote.body = templateBody;
    }
    return targetNote;
}
function genDefaultContext(targetNote) {
    const currentDate = common_all_1.Time.now();
    const CURRENT_YEAR = currentDate.toFormat("yyyy");
    const CURRENT_MONTH = currentDate.toFormat("LL");
    const CURRENT_MONTH_NAME = currentDate.toFormat("LLLL");
    const CURRENT_MONTH_NAME_SHORT = currentDate.toFormat("LLL");
    const CURRENT_WEEK = currentDate.toFormat("WW");
    const CURRENT_DAY = currentDate.toFormat("dd");
    const CURRENT_HOUR = currentDate.toFormat("HH");
    const CURRENT_MINUTE = currentDate.toFormat("mm");
    const CURRENT_SECOND = currentDate.toFormat("ss");
    const CURRENT_DAY_OF_WEEK = currentDate.toJSDate().getDay();
    const CURRENT_DAY_OF_WEEK_ABBR = currentDate.toFormat("ccc");
    const CURRENT_DAY_OF_WEEK_FULL = currentDate.toFormat("cccc");
    const CURRENT_DAY_OF_WEEK_SINGLE = currentDate.toFormat("ccccc");
    const CURRENT_QUARTER = currentDate.toFormat("q");
    return {
        CURRENT_YEAR,
        CURRENT_MONTH,
        CURRENT_MONTH_NAME,
        CURRENT_MONTH_NAME_SHORT,
        CURRENT_WEEK,
        CURRENT_DAY,
        CURRENT_HOUR,
        CURRENT_MINUTE,
        CURRENT_SECOND,
        CURRENT_DAY_OF_WEEK,
        CURRENT_DAY_OF_WEEK_ABBR,
        CURRENT_DAY_OF_WEEK_FULL,
        CURRENT_DAY_OF_WEEK_SINGLE,
        CURRENT_QUARTER,
        TITLE: targetNote.title,
        FNAME: targetNote.fname,
        DESC: targetNote.desc,
    };
}
let _INIT_HELPERS = false;
class TemplateHelpers {
    static init() {
        lodash_1.default.map(this.helpers, (v, k) => {
            handlebars_1.default.registerHelper(k, v);
        });
    }
}
/**
 * WARNING: these helpers are part of the public template api
 * any changes in these names will result in a breaking change
 * and needs to be marked as such
 */
TemplateHelpers.helpers = {
    eq: (a, b) => {
        return a === b;
    },
    fnameToDate: (patternOrOptions, options) => {
        var _a;
        let pattern = "(?<year>[\\d]{4}).(?<month>[\\d]{2}).(?<day>[\\d]{2})";
        let fname;
        if (lodash_1.default.isString(patternOrOptions)) {
            pattern = patternOrOptions;
            fname = options.data.root.FNAME;
        }
        else {
            fname = patternOrOptions.data.root.FNAME;
        }
        const resp = (_a = fname.match(new RegExp(pattern, "i"))) === null || _a === void 0 ? void 0 : _a.groups;
        if (lodash_1.default.isUndefined(resp)) {
            return "ERROR: no match found for {year}, {month}, or {day}";
        }
        const { year, month, day } = resp;
        return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    },
    getDayOfWeek: (date) => {
        const day = date.getDay();
        return day;
    },
    match: (text, pattern) => {
        const out = text.match(new RegExp(pattern, "i"));
        if (out) {
            return out[0];
        }
        return false;
    },
};
class TemplateUtils {
    /**
     * Apply template note to provided {@param note}.
     *
     * Changes include appending template note's body to end of provided note.
     */
    static applyTemplate(opts) {
        if (!_INIT_HELPERS) {
            TemplateHelpers.init();
            _INIT_HELPERS = true;
        }
        return this.applyHBTemplate(opts);
    }
    /**
     * Given a note that has a schema:
     *  - Find template specified by schema
     *  - If there is no template found, return false
     *  - Find note by template name and apply callback `pickNote` to list of notes
     *  - Apply template note returned by callback to note and return true if applied successfully
     * If note does not have a schema, return false
     *
     * @param note: note to apply template to. This modifies the note body
     * @param pickNote: cb to pick note from list of possible template notes (can also be empty)
     * @returns boolean of whether template has been applied or not
     */
    static async findAndApplyTemplate({ note, engine, pickNote, }) {
        var _a;
        const maybeSchema = await common_all_1.SchemaUtils.getSchemaFromNote({
            note,
            engine,
        });
        const maybeTemplate = maybeSchema === null || maybeSchema === void 0 ? void 0 : maybeSchema.schemas[(_a = note.schema) === null || _a === void 0 ? void 0 : _a.schemaId].data.template;
        let maybeVault;
        if (maybeTemplate) {
            // Support xvault template
            const { link: fname, vaultName } = (0, common_all_1.parseDendronURI)(maybeTemplate === null || maybeTemplate === void 0 ? void 0 : maybeTemplate.id);
            // If vault is specified, lookup by template id + vault
            if (!lodash_1.default.isUndefined(vaultName)) {
                maybeVault = common_all_1.VaultUtils.getVaultByName({
                    vname: vaultName,
                    vaults: engine.vaults,
                });
                // If vault is not found, skip lookup through rest of notes and return error
                if (lodash_1.default.isUndefined(maybeVault)) {
                    return {
                        error: new common_all_1.DendronError({
                            message: `No vault found for ${vaultName}`,
                        }),
                    };
                }
            }
            const maybeNotes = await engine.findNotes({ fname, vault: maybeVault });
            const maybeTemplateNote = await pickNote(maybeNotes);
            if (maybeTemplateNote.error) {
                return { error: maybeTemplateNote.error };
            }
            if (maybeTemplateNote.data) {
                TemplateUtils.applyTemplate({
                    templateNote: maybeTemplateNote.data,
                    targetNote: note,
                    engine,
                });
                return { data: true };
            }
        }
        return { data: false };
    }
    static applyHBTemplate({ templateNote, targetNote, }) {
        copyTemplateProps({ templateNote, targetNote });
        // TODO: cache tempaltes
        const template = handlebars_1.default.compile(templateNote.body);
        const context = genDefaultContext(targetNote);
        const templateBody = template({
            ...targetNote,
            fm: targetNote.custom,
            ...context,
        });
        addOrAppendTemplateBody({ templateBody, targetNote });
        return targetNote;
    }
    static genTrackPayload(templateNote) {
        var _a, _b, _c, _d;
        const fnameToDate = ((_a = templateNote.body.match(/\{\{\s+fnameToDate[^}]+\}\}/)) === null || _a === void 0 ? void 0 : _a.length) || 0;
        const eq = ((_b = templateNote.body.match(/\{\{\s+eq[^}]+\}\}/)) === null || _b === void 0 ? void 0 : _b.length) || 0;
        const getDayOfWeek = ((_c = templateNote.body.match(/\{\{\s+getDayOfWeek[^}]+\}\}/)) === null || _c === void 0 ? void 0 : _c.length) || 0;
        const match = ((_d = templateNote.body.match(/\{\{\s+match[^}]+\}\}/)) === null || _d === void 0 ? void 0 : _d.length) || 0;
        return {
            helperStats: {
                fnameToDate,
                eq,
                getDayOfWeek,
                match,
            },
        };
    }
}
/** The props of a template note that will get copied over when the template is applied. */
TemplateUtils.TEMPLATE_COPY_PROPS = [
    "desc",
    "custom",
    "color",
    "tags",
    "image",
];
exports.TemplateUtils = TemplateUtils;
//# sourceMappingURL=template.js.map