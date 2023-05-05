"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkdownExportPod = exports.MarkdownPublishPod = exports.MarkdownImportPod = void 0;
const common_all_1 = require("@dendronhq/common-all");
const common_server_1 = require("@dendronhq/common-server");
const unified_1 = require("@dendronhq/unified");
const fs_extra_1 = __importDefault(require("fs-extra"));
const klaw_1 = __importDefault(require("klaw"));
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
const through2_1 = __importDefault(require("through2"));
const basev3_1 = require("../basev3");
const utils_1 = require("../utils");
const ID = "dendron.markdown";
const toMarkdownLink = (assetPath, opts) => {
    const name = (opts === null || opts === void 0 ? void 0 : opts.name) ? opts.name : path_1.default.parse(assetPath).name;
    return `- [${name}](${assetPath})`;
};
class MarkdownImportPod extends basev3_1.ImportPod {
    get config() {
        return utils_1.PodUtils.createImportConfig({
            required: [],
            properties: {
                noAddUUID: {
                    description: "Don't add uuid to assets",
                    type: "boolean",
                    nullable: true,
                },
                indexName: {
                    type: "string",
                    description: "If you have an index file per directory, merge that file with the directory note",
                    nullable: true,
                },
                importFrontmatter: {
                    description: "Import note metadata. In case of any conflicts, the conflicting fields are prefixed with _import",
                    type: "boolean",
                    default: true,
                    nullable: true,
                },
                frontmatterMapping: {
                    description: "An optional set of variable mappings, with the key being the variable name in the import source and the value being the resulting variable name in Dendron. See https://wiki.dendron.so/notes/f23a6290-2dec-45dc-b616-c218ee53db6b.html for examples.",
                    type: "object",
                    nullable: true,
                },
            },
        });
    }
    /**
     * Reads all files
     * @param root
     * @returns dictionary of {@link DItem[]}
     */
    async _collectItems(root) {
        const ctx = "MarkdownPod._collectItems";
        const items = []; // files, directories, symlinks, etc
        const errors = []; // import items that resulted in errors
        const mask = root.endsWith(path_1.default.sep) ? root.length : root.length + 1;
        const excludeFilter = through2_1.default.obj(function (item, _enc, _next) {
            // check if hidden file
            if (!lodash_1.default.some(item.path.split(path_1.default.sep), (ent) => ent.startsWith("."))) {
                this.push(item);
            }
            _next();
        });
        return new Promise((resolve, _reject) => {
            (0, klaw_1.default)(root)
                .pipe(excludeFilter)
                // eslint-disable-next-line prefer-arrow-callback
                .on("data", (item) => {
                const out = { ...item, entries: [] };
                let isError = false;
                if (item.path.endsWith(".md")) {
                    try {
                        const { data, content } = (0, common_server_1.readMD)(item.path);
                        out.data = data;
                        out.body = content;
                    }
                    catch (err) {
                        this.L.error({ ctx, error: err });
                        isError = true;
                    }
                }
                if (!isError) {
                    out.path = out.path.slice(mask);
                    items.push(out);
                }
                else {
                    errors.push(out);
                }
            })
                .on("end", () => {
                this.L.info({ msg: "done collecting items" });
                resolve({ items, errors });
            });
        });
    }
    /**
     * Classify {@link DItem} into notes and assets. Turns directories into notes
     * @param items
     * @returns
     */
    async buildFileDirAssetDicts(items) {
        const engineFileDict = {};
        const assetFileDict = {};
        // create map of files
        lodash_1.default.each(items, (v, _k) => {
            if (lodash_1.default.some([v.path.endsWith(".md"), v.stats.isDirectory()])) {
                engineFileDict[v.path] = v;
            }
            else {
                assetFileDict[v.path] = v;
            }
        });
        // add assets
        lodash_1.default.values(assetFileDict).forEach((ent) => {
            let dirname = path_1.default.dirname(ent.path);
            // root directories
            if (dirname === ".") {
                dirname = "";
            }
            engineFileDict[dirname].entries.push(ent);
        });
        return { engineFileDict, assetFileDict };
    }
    /** Collects all notes and copies assets in the given files/folders, and creates asset summary notes.
     *
     * @returns The created notes and a map of asset paths to imported paths.
     */
    async collectNotesCopyAssets(opts) {
        const { files, src, vault, wsRoot, config } = opts;
        const out = {};
        const assetMap = new Map();
        // collect the assets in concurrently
        await Promise.all(files.map(async (item) => {
            const fname = (0, common_server_1.cleanFileName)(item.path, {
                isDir: item.stats.isDirectory(),
            });
            const lvl = fname.split(".").length;
            if (!lodash_1.default.has(out, lvl)) {
                out[lvl] = [];
            }
            const isDir = item.stats.isDirectory();
            const stub = item.stats.isDirectory() && lodash_1.default.isEmpty(item.entries);
            const noteProps = common_all_1.NoteUtils.create({
                fname,
                stub,
                vault,
                custom: { isDir },
            });
            if (item === null || item === void 0 ? void 0 : item.body) {
                noteProps.body = item.body;
            }
            if (item === null || item === void 0 ? void 0 : item.data) {
                noteProps.data = item.data;
            }
            // deal with non-md files
            if (!lodash_1.default.isEmpty(item.entries)) {
                // move entries over
                // TODO: don't hardcode assets
                const assetDirName = "assets";
                const vpath = (0, common_server_1.vault2Path)({ vault, wsRoot });
                const assetDir = path_1.default.join(vpath, assetDirName);
                await fs_extra_1.default.ensureDir(assetDir);
                const mdLinks = [];
                await Promise.all(item.entries.map(async (subItem) => {
                    const { ext, name } = path_1.default.parse(subItem.path);
                    let assetBaseNew;
                    if (config.noAddUUID) {
                        assetBaseNew = `${(0, common_server_1.cleanFileName)(name)}${ext}`;
                    }
                    else {
                        const uuid = (0, common_all_1.genUUIDInsecure)();
                        assetBaseNew = `${(0, common_server_1.cleanFileName)(name)}-${uuid}${ext}`;
                    }
                    const assetPathFull = path_1.default.join(assetDir, assetBaseNew);
                    const assetPathRel = path_1.default
                        .join(assetDirName, assetBaseNew)
                        .replace(/[\\]/g, "/");
                    const key = MarkdownImportPod.cleanAssetPath(subItem.path);
                    assetMap.set(key, `/${assetPathRel}`);
                    await fs_extra_1.default.copyFile(path_1.default.join(src, subItem.path), assetPathFull);
                    mdLinks.push(toMarkdownLink(`/${assetPathRel}`, { name: `${name}${ext}` }));
                }));
                noteProps.body = `## Imported Assets\n${mdLinks.join("\n")}`;
            }
            out[lvl].push(noteProps);
        }));
        return { hDict: out, assetMap };
    }
    hDict2Notes(hdict, config) {
        const noteDict = {};
        // TODO: currently don't handle stuff attached to root
        hdict[1]
            .filter((n) => !lodash_1.default.isEmpty(n.fname))
            .forEach((props) => {
            const n = common_all_1.NoteUtils.create({ ...props });
            noteDict[n.fname] = n;
        });
        let lvl = 2;
        let currRawNodes = hdict[lvl];
        while (!lodash_1.default.isEmpty(currRawNodes)) {
            currRawNodes.forEach((props) => {
                var _a;
                const parentPath = common_all_1.DNodeUtils.dirName(props.fname);
                if (noteDict[parentPath].custom.isDir &&
                    common_all_1.DNodeUtils.basename(props.fname.toLowerCase(), true) ===
                        ((_a = config.indexName) === null || _a === void 0 ? void 0 : _a.toLowerCase())) {
                    const n = noteDict[parentPath];
                    n.body = [props.body, "***", n.body].join("\n");
                    n.custom = props.custom;
                }
                else if (lodash_1.default.has(noteDict, parentPath)) {
                    const n = common_all_1.NoteUtils.create({ ...props });
                    common_all_1.DNodeUtils.addChild(noteDict[parentPath], n);
                    noteDict[n.fname] = n;
                }
                else {
                    throw Error("missing notes not supported yet");
                }
            });
            lvl += 1;
            currRawNodes = hdict[lvl];
        }
        return lodash_1.default.values(noteDict);
    }
    /** Cleans up a link following Dendron best practices, converting slashes to dots and spaces to dashes. */
    static cleanLinkValue(link) {
        return link.value.toLowerCase().replace(/[\\/]/g, ".").replace(/\s/g, "-");
    }
    static async updateLinks({ note, siblingNotes, tree, proc, }) {
        const linkPrefix = note.fname.substring(0, note.fname.lastIndexOf(".") + 1);
        const lines = note.body.split("\n");
        const links = (0, unified_1.selectAll)(unified_1.DendronASTTypes.WIKI_LINK, tree);
        links.forEach((link) => {
            const prevValue = link.value;
            const linkValue = this.cleanLinkValue(link);
            const newValue = linkPrefix.concat(linkValue);
            link.value =
                siblingNotes.filter((note) => note.fname.toLowerCase() === newValue.toLowerCase()).length > 0
                    ? newValue
                    : linkValue;
            // If link has the default alias, update that too to avoid writing a stale alias
            if (prevValue === link.data.alias) {
                link.data.alias = link.value;
            }
            const { start, end } = link.position;
            const line = lines[start.line - 1];
            lines[start.line - 1] = [
                line.slice(undefined, start.column - 1),
                proc.stringify(link),
                line.slice(end.column - 1, undefined),
            ].join("");
        });
        note.body = lines.join("\n");
    }
    static cleanAssetPath(path) {
        return path.toLowerCase().replace(/[\\|/.]/g, "");
    }
    /** Gets all links to assets. */
    static async updateAssetLinks({ note, tree, assetMap, proc, }) {
        const assetReferences = [
            ...(0, unified_1.selectAll)(unified_1.DendronASTTypes.IMAGE, tree),
            ...(0, unified_1.selectAll)(unified_1.DendronASTTypes.LINK, tree),
        ];
        const lines = note.body.split("\n");
        await Promise.all(assetReferences.map(async (asset) => {
            const key = this.cleanAssetPath(asset.url);
            let url;
            // Try finding what the new URL should be
            const assetUrl = assetMap.get(key);
            if (assetUrl) {
                url = assetUrl;
            }
            else {
                // for relative links
                const prefix = lodash_1.default.replace(note.fname.substring(0, note.fname.lastIndexOf(".")), /[\\|/.]/g, "");
                const value = assetMap.get(prefix.concat(key));
                // @ts-ignore
                if (value)
                    url = value;
            }
            // If we did manage to find it, then update this link
            if (url !== undefined && url !== "") {
                asset.url = url;
                const { start, end } = asset.position;
                const line = lines[start.line - 1];
                lines[start.line - 1] = [
                    line.slice(undefined, start.column - 1),
                    proc.stringify(asset),
                    line.slice(end.column - 1, undefined),
                ].join("");
            }
        }));
        note.body = lines.join("\n");
    }
    /**
     * Method to import frontmatter of note. Imports all FM in note.custom,
     * In case of conflict in keys of dendron and imported note, checks frontmatterMapping provided in the
     * config. If not provided, concatenates '_imported' in imported FM keys.
     */
    handleFrontmatter(opts) {
        const { note, frontmatterMapping } = opts;
        // map through all imported note's metadata
        Object.keys(note.data).map((val) => {
            if (lodash_1.default.has(note, val)) {
                //check for mapping in frontmatterMapping
                if (frontmatterMapping && lodash_1.default.has(frontmatterMapping, val)) {
                    note.data = {
                        ...note.data,
                        [frontmatterMapping[val]]: note.data[val],
                    };
                }
                else {
                    // append _imported in imported metadata keys
                    note.data = {
                        ...note.data,
                        [`${val}_imported`]: note.data[val],
                    };
                }
                delete note.data[val];
            }
        });
        note.custom = lodash_1.default.merge(note.custom, note.data);
    }
    async plant(opts) {
        const ctx = "MarkdownPod";
        const { wsRoot, engine, src, vault, config } = opts;
        this.L.info({ ctx, wsRoot, src: src.fsPath, msg: "enter" });
        // get all items
        const { items, errors } = await this._collectItems(src.fsPath);
        this.L.info({ ctx, wsRoot, numItems: lodash_1.default.size(items), msg: "collectItems" });
        const { engineFileDict } = await this.buildFileDirAssetDicts(items);
        const { hDict, assetMap } = await this.collectNotesCopyAssets({
            files: lodash_1.default.values(engineFileDict),
            src: src.fsPath,
            vault,
            wsRoot,
            config,
        });
        const notes = this.hDict2Notes(hDict, config);
        const { importFrontmatter = true, frontmatterMapping } = config;
        const notesClean = await Promise.all(notes
            .filter((note) => !note.stub)
            .map(async (note) => {
            //notes in same level with note
            const noteDirlevel = note.fname.split(".").length;
            const siblingNotes = hDict[noteDirlevel];
            const proc = unified_1.MDUtilsV5.procRemarkFull({
                noteToRender: note,
                fname: note.fname,
                vault: note.vault,
                vaults: engine.vaults,
                dest: unified_1.DendronASTDest.MD_DENDRON,
                config: common_server_1.DConfig.readConfigSync(engine.wsRoot),
                wsRoot: engine.wsRoot,
            });
            const tree = proc.parse(note.body);
            await MarkdownImportPod.updateLinks({
                note,
                tree,
                siblingNotes,
                proc,
            });
            await MarkdownImportPod.updateAssetLinks({
                note,
                tree,
                assetMap,
                proc,
            });
            if (config.frontmatter) {
                note.custom = lodash_1.default.merge(note.custom, config.frontmatter);
            }
            if (config.fnameAsId) {
                note.id = note.fname;
            }
            if (importFrontmatter) {
                this.handleFrontmatter({ note, frontmatterMapping });
            }
            return note;
        }));
        await engine.bulkWriteNotes({ notes: notesClean, skipMetadata: true });
        this.L.info({
            ctx,
            wsRoot,
            src: src.fsPath,
            msg: `${lodash_1.default.size(notesClean)} notes imported`,
        });
        return { importedNotes: notesClean, errors };
    }
}
MarkdownImportPod.id = ID;
MarkdownImportPod.description = "import markdown";
exports.MarkdownImportPod = MarkdownImportPod;
class MarkdownPublishPod extends basev3_1.PublishPod {
    get config() {
        return utils_1.PodUtils.createPublishConfig({
            required: [],
            properties: {
                wikiLinkToURL: {
                    type: "boolean",
                    description: "convert all the wikilinks to URL",
                    default: "false",
                    nullable: true,
                },
            },
        });
    }
    async plant(opts) {
        const { engine, note, config, dendronConfig } = opts;
        const { wikiLinkToURL = false } = config;
        const noteCacheForRenderDict = await (0, unified_1.getParsingDependencyDicts)(note, engine, config, engine.vaults);
        const rawConfig = common_server_1.DConfig.readConfigSync(engine.wsRoot);
        let remark = unified_1.MDUtilsV5.procRemarkFull({
            noteToRender: note,
            noteCacheForRenderDict,
            dest: unified_1.DendronASTDest.MD_REGULAR,
            config: {
                ...rawConfig,
                preview: {
                    ...rawConfig.preview,
                    enablePrettyRefs: false,
                },
                publishing: {
                    ...rawConfig.publishing,
                    enablePrettyRefs: false,
                },
            },
            fname: note.fname,
            vault: note.vault,
            vaults: engine.vaults,
            wsRoot: engine.wsRoot,
        });
        if (wikiLinkToURL && !lodash_1.default.isUndefined(dendronConfig)) {
            remark = remark.use(unified_1.RemarkUtils.convertWikiLinkToNoteUrl(note, [], engine, dendronConfig));
        }
        else {
            remark = remark.use(unified_1.RemarkUtils.convertLinksFromDotNotation(note, []));
        }
        const out = (await remark.process(note.body)).toString();
        return lodash_1.default.trim(out);
    }
}
MarkdownPublishPod.id = ID;
MarkdownPublishPod.description = "publish markdown";
exports.MarkdownPublishPod = MarkdownPublishPod;
/**
 *
 */
class MarkdownExportPod extends basev3_1.ExportPod {
    get config() {
        return utils_1.PodUtils.createExportConfig({
            required: [],
            properties: {},
        });
    }
    async plant(opts) {
        const ctx = "MarkdownExportPod:plant";
        const { dest, notes, vaults, wsRoot } = opts;
        // verify dest exist
        const podDstPath = dest.fsPath;
        fs_extra_1.default.ensureDirSync(path_1.default.dirname(podDstPath));
        const mdPublishPod = new MarkdownPublishPod();
        this.L.info({ ctx, msg: "pre:iterate_notes" });
        await Promise.all(notes.map(async (note) => {
            const body = await mdPublishPod.plant({ ...opts, note });
            const hpath = dot2Slash(note.fname) + ".md";
            const vname = common_all_1.VaultUtils.getName(note.vault);
            const fpath = path_1.default.join(podDstPath, vname, hpath);
            // fpath = _.isEmpty(note.children)
            //   ? fpath + ".md"
            //   : path.join(fpath, "index.md");
            this.L.info({ ctx, fpath, msg: "pre:write" });
            await fs_extra_1.default.ensureDir(path_1.default.dirname(fpath));
            return fs_extra_1.default.writeFile(fpath, body);
        }));
        // Export Assets
        await Promise.all(vaults.map(async (vault) => {
            const destPath = path_1.default.join(dest.fsPath, common_all_1.VaultUtils.getRelPath(vault), common_all_1.FOLDERS.ASSETS);
            const srcPath = path_1.default.join(wsRoot, common_all_1.VaultUtils.getRelPath(vault), common_all_1.FOLDERS.ASSETS);
            if (fs_extra_1.default.pathExistsSync(srcPath)) {
                await fs_extra_1.default.copy(srcPath, destPath);
            }
        }));
        return { notes };
    }
}
MarkdownExportPod.id = ID;
MarkdownExportPod.description = "export notes as markdown";
exports.MarkdownExportPod = MarkdownExportPod;
function dot2Slash(fname) {
    const hierarchy = fname.split(".");
    return path_1.default.join(...hierarchy);
}
//# sourceMappingURL=MarkdownPod.js.map