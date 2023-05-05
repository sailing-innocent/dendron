import execa from "execa";
type PkgJson = {
    name: string;
    displayName: string;
    description: string;
    main: string;
    version: string;
    repository: PkgRepository;
    devDependencies: {
        [key: string]: string;
    };
    icon: string;
    license: string;
};
type PkgRepository = {
    type: "git";
    url: string;
    directory?: string;
};
export declare enum SemverVersion {
    MAJOR = "major",
    MINOR = "minor",
    PATCH = "patch",
    PRERELEASE = "prerelease"
}
export declare enum PublishEndpoint {
    LOCAL = "local",
    REMOTE = "remote"
}
export declare enum ExtensionType {
    DENDRON = "dendron",
    NIGHTLY = "nightly",
    ENTERPRISE = "enterprise"
}
export declare class LernaUtils {
    static bumpVersion(version: SemverVersion): void;
    static publishVersion(endpoint: PublishEndpoint): Promise<void>;
}
export declare class BuildUtils {
    static getLernaRoot(): string;
    static getCurrentVersion(): string;
    static getPluginRootPath(): string;
    static getPluginViewsRootPath(): string;
    static getPkgMeta({ pkgPath }: {
        pkgPath: string;
    }): PkgJson;
    static restorePluginPkgJson(): void;
    static setRegLocal(): void;
    static setRegRemote(): void;
    static genNextVersion(opts: {
        currentVersion: string;
        upgradeType: SemverVersion;
    }): string;
    static buildPluginViews(): void;
    static installPluginDependencies(): execa.ExecaSyncReturnValue<string>;
    static installPluginLocally(version: string): Promise<[execa.ExecaReturnValue<string>, execa.ExecaReturnValue<string>]>;
    static compilePlugin({ quiet, skipSentry, }: {
        quiet?: boolean;
        skipSentry?: boolean;
    }): Promise<void>;
    /**
     * @param param0
     * @returns
     */
    static packagePluginDependencies({ skipSentry, quiet, extensionTarget, }: {
        skipSentry?: boolean;
        quiet?: boolean;
        extensionTarget?: string;
    }): Promise<void>;
    static prepPluginPkg(target?: ExtensionType): Promise<void>;
    /**
     * Gets the appropriate version to use for nightly ext. Published versions in
     * the marketplace must be monotonically increasing. If current package.json
     * version is greated than the marketplace, use that. Otherwise, just bump the
     * patch version.
     * @returns
     */
    static getIncrementedVerForNightly(): Promise<string | undefined>;
    /**
     * Set NPM to publish locally
     */
    static prepPublishLocal(): void;
    /**
     * Set NPM to publish remotely
     */
    static prepPublishRemote(): void;
    /**
     *
     * @returns
     * @throws Error if typecheck is not successful
     */
    static runTypeCheck(): void;
    static sleep(ms: number): Promise<unknown>;
    static startVerdaccio(): execa.ExecaChildProcess<string>;
    /**
     * Migrate assets from next-server, plugin-views, and api-server to plugin-core
     * @returns
     * ^gg4woyhxe1xn
     */
    static syncStaticAssets(): Promise<{
        staticPath: string;
    }>;
    static syncStaticAssetsToNextjsTemplate(): Promise<void>;
    static removeDevDepsFromPkgJson({ pkgPath, dependencies, }: {
        pkgPath: string;
        dependencies: string[];
    }): void;
    static updatePkgMeta({ pkgPath, name, displayName, description, main, repository, version, license, icon, }: {
        pkgPath: string;
        name: string;
        displayName: string;
        license: string;
    } & Partial<PkgJson>): void;
    static publish({ cwd, osvxKey }: {
        cwd: string;
        osvxKey: string;
    }): Promise<[execa.ExecaSyncReturnValue<string>, execa.ExecaSyncReturnValue<string>]>;
    static publishInsider(): Promise<void>;
}
export {};
