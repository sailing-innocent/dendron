"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readJson = exports.readString = exports.removeMDExtension = exports.resolvePath = exports.resolveTilde = exports.getAllFiles = exports.getAllFilesWithTypes = exports.deleteFile = exports.writeYAMLAsync = exports.writeYAML = exports.readYAMLAsync = exports.readYAML = exports.readMD = exports.findInParent = exports.cleanFileName = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const gray_matter_1 = __importDefault(require("gray-matter"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const lodash_1 = __importDefault(require("lodash"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const common_all_1 = require("@dendronhq/common-all");
/**
 *
 * Normalize file name
 * - strip off extension
 * - replace [.\s] with -
 * @param name
 * @param opts
 *   - isDir: dealing with directory
 */
function cleanFileName(name, opts) {
    const cleanOpts = lodash_1.default.defaults(opts, { isDir: false });
    if (!cleanOpts.isDir) {
        const { name: fname, dir } = path_1.default.parse(name);
        // strip off extension
        name = path_1.default.join(dir, fname);
    }
    name = name.replace(/\./g, "-");
    // replace all names already in file name
    //name = name.replace(/\./g, "-");
    name = (0, common_all_1.cleanName)(name);
    // if file, only get name (no extension)
    return name;
}
exports.cleanFileName = cleanFileName;
function findInParent(base, fname) {
    let acc = 10;
    const lvls = [];
    while (acc > 0) {
        const tryPath = path_1.default.join(base, ...lvls, fname);
        if (fs_extra_1.default.existsSync(tryPath)) {
            return path_1.default.dirname(tryPath);
        }
        acc -= 1;
        lvls.push("..");
    }
    return;
}
exports.findInParent = findInParent;
function readMD(fpath) {
    return gray_matter_1.default.read(fpath, {});
}
exports.readMD = readMD;
/**
 *
 * @param fpath path of yaml file to read
 * @param overwriteDuplcate if set to true, will not throw duplicate entry exception and use the last entry.
 * @returns
 */
function readYAML(fpath, overwriteDuplicate) {
    return js_yaml_1.default.load(fs_extra_1.default.readFileSync(fpath, { encoding: "utf8" }), {
        schema: js_yaml_1.default.JSON_SCHEMA,
        json: overwriteDuplicate !== null && overwriteDuplicate !== void 0 ? overwriteDuplicate : false,
    });
}
exports.readYAML = readYAML;
async function readYAMLAsync(fpath) {
    return js_yaml_1.default.load(await fs_extra_1.default.readFile(fpath, { encoding: "utf8" }), {
        schema: js_yaml_1.default.JSON_SCHEMA,
    });
}
exports.readYAMLAsync = readYAMLAsync;
function writeYAML(fpath, data) {
    const out = js_yaml_1.default.dump(data, { indent: 4, schema: js_yaml_1.default.JSON_SCHEMA });
    return fs_extra_1.default.writeFileSync(fpath, out);
}
exports.writeYAML = writeYAML;
function writeYAMLAsync(fpath, data) {
    const out = js_yaml_1.default.dump(data, { indent: 4, schema: js_yaml_1.default.JSON_SCHEMA });
    return fs_extra_1.default.writeFile(fpath, out);
}
exports.writeYAMLAsync = writeYAMLAsync;
function deleteFile(fpath) {
    return fs_extra_1.default.unlinkSync(fpath);
}
exports.deleteFile = deleteFile;
/** Gets all files in `root`, with include and exclude lists (glob matched)
 *
 * This function returns the full `Dirent` which gives you access to file
 * metadata. If you don't need the metadata, see {@link getAllFiles}.
 *
 * @throws a `DendronError` with `ERROR_SEVERITY.MINOR`. This is to avoid
 * crashing the Dendron initialization, please catch the error and modify the
 * severity if needed.
 */
async function getAllFilesWithTypes(opts) {
    const { root } = lodash_1.default.defaults(opts, {
        exclude: [".git", "Icon\r", ".*"],
    });
    try {
        const allFiles = await fs_extra_1.default.readdir(root.fsPath, { withFileTypes: true });
        return {
            data: allFiles
                .map((dirent) => {
                const { name: fname } = dirent;
                // match exclusions
                if (lodash_1.default.some([dirent.isDirectory(), (0, common_all_1.globMatch)(opts.exclude || [], fname)])) {
                    return null;
                }
                // match inclusion
                if (opts.include && !(0, common_all_1.globMatch)(opts.include, fname)) {
                    return null;
                }
                return dirent;
            })
                .filter(common_all_1.isNotNull),
            error: null,
        };
    }
    catch (err) {
        return {
            error: new common_all_1.DendronError({
                message: "Error when reading the vault",
                payload: err,
                // Marked as minor to avoid stopping initialization. Even if we can't read one vault, we might be able to read other vaults.
                severity: common_all_1.ERROR_SEVERITY.MINOR,
            }),
        };
    }
}
exports.getAllFilesWithTypes = getAllFilesWithTypes;
/** Gets all files in `root`, with include and exclude lists (glob matched)
 *
 * This function returns only the file name. If you need the file metadata, see
 * {@link getAllFilesWithTypes}.
 *
 * @throws a `DendronError` with `ERROR_SEVERITY.MINOR`. This is to avoid
 * crashing the Dendron initialization, please catch the error and modify the
 * severity if needed.
 */
async function getAllFiles(opts) {
    var _a;
    const out = await getAllFilesWithTypes(opts);
    const data = (_a = out.data) === null || _a === void 0 ? void 0 : _a.map((item) => item.name);
    return { error: out.error, data };
}
exports.getAllFiles = getAllFiles;
/**
 * Convert a node to a MD File. Any custom attributes will be
 * added to the end
 *
 * @param node: node to convert
 * @param opts
 *   - root: root folder where files should be written to
 */
function resolveTilde(filePath) {
    if (!filePath || typeof filePath !== "string") {
        return "";
    }
    // '~/folder/path' or '~'
    if (filePath[0] === "~" &&
        (filePath[1] === path_1.default.sep || filePath.length === 1)) {
        return filePath.replace("~", os_1.default.homedir());
    }
    return filePath;
}
exports.resolveTilde = resolveTilde;
/**
 * Resolve file path and resolve relative paths relative to `root`
 * @param filePath
 * @param root
 */
function resolvePath(filePath, root) {
    const platform = os_1.default.platform();
    const isWin = platform === "win32";
    if (filePath[0] === "~") {
        return resolveTilde(filePath);
    }
    else if (path_1.default.isAbsolute(filePath) ||
        (isWin && filePath.startsWith("\\"))) {
        return filePath;
    }
    else {
        if (!root) {
            throw Error("can't use rel path without a workspace root set");
        }
        return path_1.default.join(root, filePath);
    }
}
exports.resolvePath = resolvePath;
// @deprecate, NoteUtils.normalizeFname
function removeMDExtension(nodePath) {
    const idx = nodePath.lastIndexOf(".md");
    if (idx > 0) {
        nodePath = nodePath.slice(0, idx);
    }
    return nodePath;
}
exports.removeMDExtension = removeMDExtension;
const readFileSync = (0, common_all_1.fromThrowable)(fs_extra_1.default.readFileSync, (error) => {
    return new common_all_1.DendronError({
        message: `Cannot find ${path_1.default}`,
        severity: common_all_1.ERROR_SEVERITY.FATAL,
        ...(error instanceof Error && { innerError: error }),
    });
});
function readString(path) {
    return readFileSync(path, "utf8");
}
exports.readString = readString;
function readJson(path) {
    return (0, common_all_1.fromPromise)(fs_extra_1.default.readJSON(path), (error) => {
        return new common_all_1.DendronError({
            message: `Cannot find ${path}`,
            severity: common_all_1.ERROR_SEVERITY.FATAL,
            ...(error instanceof Error && { innerError: error }),
        });
    });
}
exports.readJson = readJson;
//# sourceMappingURL=files.js.map