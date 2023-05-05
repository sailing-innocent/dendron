"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildUtils = exports.LernaUtils = exports.ExtensionType = exports.PublishEndpoint = exports.SemverVersion = void 0;
/* eslint-disable no-console */
const common_all_1 = require("@dendronhq/common-all");
const common_server_1 = require("@dendronhq/common-server");
const execa_1 = __importDefault(require("execa"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
const semver_1 = __importDefault(require("semver"));
var SemverVersion;
(function (SemverVersion) {
    SemverVersion["MAJOR"] = "major";
    SemverVersion["MINOR"] = "minor";
    SemverVersion["PATCH"] = "patch";
    SemverVersion["PRERELEASE"] = "prerelease";
})(SemverVersion = exports.SemverVersion || (exports.SemverVersion = {}));
var PublishEndpoint;
(function (PublishEndpoint) {
    PublishEndpoint["LOCAL"] = "local";
    PublishEndpoint["REMOTE"] = "remote";
})(PublishEndpoint = exports.PublishEndpoint || (exports.PublishEndpoint = {}));
var ExtensionType;
(function (ExtensionType) {
    ExtensionType["DENDRON"] = "dendron";
    ExtensionType["NIGHTLY"] = "nightly";
    ExtensionType["ENTERPRISE"] = "enterprise";
})(ExtensionType = exports.ExtensionType || (exports.ExtensionType = {}));
const LOCAL_NPM_ENDPOINT = "http://localhost:4873";
const REMOTE_NPM_ENDPOINT = "https://registry.npmjs.org";
const $ = (cmd, opts) => {
    return execa_1.default.commandSync(cmd, { shell: true, ...opts });
};
const $$ = (cmd, opts) => {
    var _a;
    const out = execa_1.default.command(cmd, { shell: true, ...opts });
    if (!(opts === null || opts === void 0 ? void 0 : opts.quiet)) {
        (_a = out.stdout) === null || _a === void 0 ? void 0 : _a.pipe(process.stdout);
    }
    return out;
};
class LernaUtils {
    static bumpVersion(version) {
        $(`lerna version ${version} --no-git-tag-version`);
        $(`git add .`);
        $(`git commit -m "chore: publish ${version}"`);
    }
    static async publishVersion(endpoint) {
        const url = endpoint === PublishEndpoint.LOCAL
            ? LOCAL_NPM_ENDPOINT
            : REMOTE_NPM_ENDPOINT;
        await $$(`lerna publish from-package --ignore-scripts --registry ${url}`);
        $(`node bootstrap/scripts/genMeta.js`);
    }
}
exports.LernaUtils = LernaUtils;
class BuildUtils {
    static getLernaRoot() {
        const maybeRoot = (0, common_server_1.findUpTo)({
            base: process.cwd(),
            fname: "lerna.json",
            returnDirPath: true,
            maxLvl: 4,
        });
        if (!maybeRoot) {
            throw new common_all_1.DendronError({
                message: `no lerna root found from ${process.cwd()}`,
            });
        }
        return maybeRoot;
    }
    static getCurrentVersion() {
        return fs_extra_1.default.readJSONSync(path_1.default.join(this.getLernaRoot(), "lerna.json"))
            .version;
    }
    static getPluginRootPath() {
        return path_1.default.join(this.getLernaRoot(), "packages", "plugin-core");
    }
    static getPluginViewsRootPath() {
        return path_1.default.join(this.getLernaRoot(), "packages", "dendron-plugin-views");
    }
    static getPkgMeta({ pkgPath }) {
        return fs_extra_1.default.readJSONSync(pkgPath);
    }
    static restorePluginPkgJson() {
        const pkgPath = path_1.default.join(this.getPluginRootPath(), "package.json");
        $(`git checkout -- ${pkgPath}`);
    }
    static setRegLocal() {
        $(`yarn config set registry ${LOCAL_NPM_ENDPOINT}`);
        $(`npm set registry ${LOCAL_NPM_ENDPOINT}`);
    }
    static setRegRemote() {
        $(`yarn config set registry ${REMOTE_NPM_ENDPOINT}`);
        $(`npm set registry ${REMOTE_NPM_ENDPOINT}`);
    }
    static genNextVersion(opts) {
        return semver_1.default.inc(opts.currentVersion, opts.upgradeType);
    }
    static buildPluginViews() {
        const root = this.getPluginViewsRootPath();
        $(`yarn build:prod`, { cwd: root });
    }
    static installPluginDependencies() {
        // remove root package.json before installing locally
        fs_extra_1.default.removeSync(path_1.default.join(this.getLernaRoot(), "package.json"));
        return $(`yarn install --no-lockfile --update-checksums`, {
            cwd: this.getPluginRootPath(),
        });
    }
    static installPluginLocally(version) {
        return Promise.all([
            $$(`code-insiders --install-extension "dendron-${version}.vsix" --force`, { cwd: this.getPluginRootPath() }),
            $$(`codium --install-extension "dendron-${version}.vsix" --force`, {
                cwd: this.getPluginRootPath(),
            }),
        ]);
    }
    static async compilePlugin({ quiet, skipSentry, }) {
        await $$(`yarn build:prod`, {
            cwd: this.getPluginRootPath(),
            env: skipSentry ? { SKIP_SENTRY: "true" } : {},
            quiet,
        });
    }
    /**
     * @param param0
     * @returns
     */
    static async packagePluginDependencies({ skipSentry, quiet, extensionTarget, }) {
        const execOpts = {
            cwd: this.getPluginRootPath(),
            env: skipSentry ? { SKIP_SENTRY: "true" } : {},
            quiet,
        };
        if (extensionTarget) {
            await $$(`vsce package --yarn --target ${extensionTarget}`, execOpts);
        }
        else {
            await $$(`vsce package --yarn`, execOpts);
        }
    }
    static async prepPluginPkg(target = ExtensionType.DENDRON) {
        const pkgPath = path_1.default.join(this.getPluginRootPath(), "package.json");
        let version;
        let description;
        let icon;
        let license = "GPLv3";
        let name;
        switch (target) {
            case ExtensionType.DENDRON: {
                name = target.toString();
                break;
            }
            case ExtensionType.NIGHTLY: {
                name = target.toString();
                version = await this.getIncrementedVerForNightly();
                description =
                    "This is a prerelease version of Dendron that may be unstable. Please install the main dendron extension instead.";
                icon = "media/logo-bw.png";
                break;
            }
            case ExtensionType.ENTERPRISE: {
                name = `dendron-enterprise`;
                version = await this.getIncrementedVerForNightly();
                description = "Dendron - Enterprise Version";
                license =
                    "see license in https://github.com/dendronhq/dendron/wiki/Enterprise-EULA";
                break;
            }
            default: {
                (0, common_all_1.assertUnreachable)(target);
            }
        }
        this.updatePkgMeta({
            pkgPath,
            name,
            license,
            displayName: name,
            description,
            main: "./dist/extension.js",
            repository: {
                url: "https://github.com/dendronhq/dendron.git",
                type: "git",
            },
            version,
            icon,
        });
        this.removeDevDepsFromPkgJson({
            pkgPath,
            dependencies: [
                "@dendronhq/common-test-utils",
                "@dendronhq/engine-test-utils",
                "vscode-test",
            ],
        });
        await Promise.all(["prisma-shim.js", "adm-zip.js"].map((ent) => {
            return fs_extra_1.default.copy(path_1.default.join(this.getPluginRootPath(), "..", "engine-server", "src", "drivers", ent), path_1.default.join(this.getPluginRootPath(), "dist", ent));
        }));
    }
    /**
     * Gets the appropriate version to use for nightly ext. Published versions in
     * the marketplace must be monotonically increasing. If current package.json
     * version is greated than the marketplace, use that. Otherwise, just bump the
     * patch version.
     * @returns
     */
    static async getIncrementedVerForNightly() {
        const pkgPath = path_1.default.join(this.getPluginRootPath(), "package.json");
        const { version } = this.getPkgMeta({ pkgPath });
        const packageJsonVersion = version;
        console.log("package.json manifest version is " + packageJsonVersion);
        try {
            const extMetadata = await $$(`npx vsce show dendron.nightly --json`, {
                cwd: this.getPluginRootPath(),
            });
            const result = extMetadata.stdout;
            const formatted = result.replace("\t", "").replace("\n", "");
            const json = JSON.parse(formatted);
            const marketplaceVersion = json.versions[0]["version"];
            console.log("Marketplace Version is " + marketplaceVersion);
            const verToUse = semver_1.default.lt(marketplaceVersion, packageJsonVersion)
                ? packageJsonVersion
                : semver_1.default.inc(marketplaceVersion, "patch");
            return verToUse !== null && verToUse !== void 0 ? verToUse : undefined;
        }
        catch (err) {
            console.error("Unable to fetch current version for nightly ext from VS Code marketplace. Attempting to use version in package.json. Error " +
                (0, common_all_1.error2PlainObject)(err));
            return version;
        }
    }
    /**
     * Set NPM to publish locally
     */
    static prepPublishLocal() {
        this.setRegLocal();
    }
    /**
     * Set NPM to publish remotely
     */
    static prepPublishRemote() {
        this.setRegRemote();
    }
    /**
     *
     * @returns
     * @throws Error if typecheck is not successful
     */
    static runTypeCheck() {
        $("yarn lerna:typecheck", { cwd: this.getLernaRoot() });
    }
    static async sleep(ms) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({});
            }, ms);
        });
    }
    static startVerdaccio() {
        const subprocess = (0, execa_1.default)("verdaccio");
        const logger = (0, common_server_1.createLogger)("verdaccio");
        subprocess.on("close", () => {
            logger.error({ state: "close" });
        });
        subprocess.on("disconnect", () => {
            logger.error({ state: "disconnect" });
        });
        subprocess.on("exit", () => {
            logger.error({ state: "exit" });
        });
        subprocess.on("error", (err) => {
            logger.error({ state: "error", payload: err });
        });
        subprocess.on("message", (message) => {
            logger.info({ state: "message", message });
        });
        if (subprocess.stdout && subprocess.stderr) {
            subprocess.stdout.on("data", (chunk) => {
                process.stdout.write(chunk);
                // verdaccio is ready
                // if (chunk.toString().match("http address")) {
                // }
            });
            subprocess.stderr.on("data", (chunk) => {
                process.stdout.write(chunk);
            });
        }
        return subprocess;
    }
    /**
     * Migrate assets from next-server, plugin-views, and api-server to plugin-core
     * @returns
     * ^gg4woyhxe1xn
     */
    static async syncStaticAssets() {
        // all assets are stored here
        const commonAssetsRoot = path_1.default.join(this.getLernaRoot(), "packages", "common-assets");
        const commonAssetsBuildRoot = path_1.default.join(commonAssetsRoot, "build");
        const commonAssetsStylesRoot = path_1.default.join(commonAssetsRoot, "styles");
        // destination for assets
        const pluginAssetPath = path_1.default.join(this.getPluginRootPath(), "assets");
        const pluginStaticPath = path_1.default.join(pluginAssetPath, "static");
        const pluginViewsRoot = path_1.default.join(this.getLernaRoot(), "packages", "dendron-plugin-views");
        fs_extra_1.default.ensureDirSync(pluginStaticPath);
        fs_extra_1.default.emptyDirSync(pluginStaticPath);
        // copy over common assets
        fs_extra_1.default.copySync(path_1.default.join(commonAssetsRoot, "assets", "css"), pluginStaticPath);
        // copy over katex fonts
        const katexFontsPath = path_1.default.join(commonAssetsBuildRoot, "assets", "css", "fonts");
        fs_extra_1.default.copySync(katexFontsPath, path_1.default.join(pluginStaticPath, "css", "themes", "fonts"));
        fs_extra_1.default.copySync(path_1.default.join(commonAssetsRoot, "assets", "js"), path_1.default.join(pluginStaticPath, "js"));
        // copy assets from plugin view
        fs_extra_1.default.copySync(path_1.default.join(pluginViewsRoot, "build", "static", "css"), path_1.default.join(pluginStaticPath, "css"));
        fs_extra_1.default.copySync(path_1.default.join(pluginViewsRoot, "build", "static", "js"), path_1.default.join(pluginStaticPath, "js"));
        fs_extra_1.default.copySync(path_1.default.join(commonAssetsStylesRoot, "scss"), path_1.default.join(pluginViewsRoot, "src", "styles", "scss"));
        return { staticPath: pluginStaticPath };
    }
    // ^gxyyk2p87a5z
    static async syncStaticAssetsToNextjsTemplate() {
        // all assets are stored here
        const commonAssetsRoot = path_1.default.join(this.getLernaRoot(), "packages", "common-assets");
        // destination for assets
        const templatePath = path_1.default.join(this.getLernaRoot(), "packages", "nextjs-template");
        const templatePublicPath = path_1.default.join(templatePath, "public");
        const templateAssetPath = path_1.default.join(templatePublicPath, "assets-dendron");
        // copy files
        fs_extra_1.default.ensureDirSync(templateAssetPath);
        fs_extra_1.default.emptyDirSync(templateAssetPath);
        fs_extra_1.default.copySync(path_1.default.join(commonAssetsRoot, "build", "assets"), templateAssetPath);
        fs_extra_1.default.copySync(path_1.default.join(commonAssetsRoot, "build", "top"), templatePublicPath);
        fs_extra_1.default.copySync(path_1.default.join(commonAssetsRoot, "styles", "scss"), path_1.default.join(templatePath, "styles", "scss"));
    }
    static removeDevDepsFromPkgJson({ pkgPath, dependencies, }) {
        const pkg = fs_extra_1.default.readJSONSync(pkgPath);
        lodash_1.default.forEach(pkg.devDependencies, (_v, k) => {
            if (dependencies.includes(k)) {
                delete pkg.devDependencies[k];
            }
        });
        fs_extra_1.default.writeJSONSync(pkgPath, pkg, { spaces: 4 });
    }
    static updatePkgMeta({ pkgPath, name, displayName, description, main, repository, version, license, icon, }) {
        const pkg = fs_extra_1.default.readJSONSync(pkgPath);
        pkg.name = name;
        if (description) {
            pkg.description = description;
        }
        if (displayName) {
            pkg.displayName = displayName;
        }
        if (main) {
            pkg.main = main;
        }
        if (repository) {
            pkg.repository = repository;
        }
        if (version) {
            pkg.version = version;
        }
        if (icon) {
            pkg.icon = icon;
        }
        pkg.main = "dist/extension.js";
        pkg.license = license;
        fs_extra_1.default.writeJSONSync(pkgPath, pkg, { spaces: 4 });
    }
    static async publish({ cwd, osvxKey }) {
        return Promise.all([
            $("vsce publish", { cwd }),
            $("ovsx publish", {
                cwd,
                env: {
                    OVSX_PAT: osvxKey,
                },
            }),
        ]);
    }
    static async publishInsider() {
        const pkgPath = this.getPluginRootPath();
        const { name, version } = await this.getPkgMeta({ pkgPath });
        const pkg = `${name}-${version}.vsix`;
        const bucket = "org-dendron-public-assets";
        await $(`aws s3 cp $package s3://${bucket}/publish/$${pkg}`);
        console.log(`https://${bucket}.s3.amazonaws.com/publish/${pkg}`);
    }
}
exports.BuildUtils = BuildUtils;
//# sourceMappingURL=build.js.map