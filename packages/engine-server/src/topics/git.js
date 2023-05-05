"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Git = void 0;
const execa_1 = __importDefault(require("execa"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
/**
 * Work directly with git repositories
 */
class Git {
    static async getRepo(fpath) {
        return fs_extra_1.default.existsSync(path_1.default.join(fpath, ".git"));
    }
    constructor(opts) {
        this.opts = opts;
    }
    async _execute(cmd) {
        const [git, ...args] = cmd.split(" ");
        return (0, execa_1.default)(git, args, { cwd: this.opts.localUrl });
    }
    async isRepo() {
        return Git.getRepo(this.opts.localUrl);
    }
    async client(gitArgs) {
        const { localUrl: cwd } = this.opts;
        const { stdout } = await (0, execa_1.default)("git", gitArgs, { cwd });
        return stdout;
    }
    async commit(opts) {
        const { msg } = opts;
        const { localUrl: cwd } = this.opts;
        await (0, execa_1.default)("git", ["commit", "-m", msg], {
            cwd,
        });
    }
    async add(args) {
        await this._execute(`git add ${args}`);
    }
    async clone(destOverride) {
        const { localUrl, remoteUrl } = this.opts;
        const cmdParts = ["git clone", remoteUrl];
        if (destOverride) {
            cmdParts.push(destOverride);
        }
        await execa_1.default.command(cmdParts.join(" "), {
            shell: true,
            cwd: localUrl,
        });
        return localUrl;
    }
    /** Adds the `remoteUrl` set in the constructor as a remote. */
    async remoteAdd() {
        const { remoteUrl } = this.opts;
        const remoteName = "origin";
        await this._execute(`git remote add ${remoteName} ${remoteUrl}`);
        return remoteName;
    }
    async remoteSet(remoteName) {
        const { remoteUrl } = this.opts;
        await this._execute(`git remote set-url ${remoteName} ${remoteUrl}`);
    }
    async remoteGet(remoteName) {
        const { stdout } = await this._execute(`git remote get-url ${remoteName}`);
        return stdout.trim();
    }
    async init() {
        await this._execute(`git init${this.opts.bare ? " --bare" : ""}`);
    }
    /** Equivalent to `git branch`.
     *
     * @param opts.m Can be used to rename a branch. If `opts.m.oldBranch` is not provided, it's the current branch.
     */
    async branch(opts) {
        const args = ["git", "branch"];
        if (opts.m) {
            args.push("-m");
            if (opts.m.oldBranch)
                args.push(opts.m.oldBranch);
            args.push(opts.m.newBranch);
        }
        await this._execute(args.join(" "));
    }
    /** Set the upstream (remote tracking) branch of `branch`.
     *
     * @param opts.branch The branch to configure, defaults to current branch.
     * @param opts.origin The remote that will be set as upstream.
     * @param opts.upstreamBranch The remote branch in `origin` that will be the upstream branch.
     */
    async setUpsteamTo(opts) {
        const args = ["git", "branch"];
        if (opts.branch)
            args.push(opts.branch);
        args.push(`${opts.origin}/${opts.upsteamBranch}`);
        await this._execute(args.join(" "));
    }
    async pull() {
        const { localUrl: cwd } = this.opts;
        await execa_1.default.command([`git pull --rebase`].join(" "), {
            shell: true,
            cwd,
        });
    }
    async rebaseAbort() {
        await this._execute("git rebase --abort");
    }
    async fetch() {
        return this._execute("git fetch");
    }
    async push(setUpstream) {
        const { localUrl: cwd } = this.opts;
        let setUpstremArg = "";
        if (setUpstream)
            setUpstremArg = ` --set-upstream ${setUpstream.remote} ${setUpstream.branch}`;
        await execa_1.default.command([`git push${setUpstremArg}`].join(" "), {
            shell: true,
            cwd,
        });
    }
    /** Creates a dangling stash commit without changing the index or working tree. */
    async stashCreate() {
        const { stdout } = await this._execute(`git stash create`);
        return stdout;
    }
    /** Confirms that the commit given (output of {@link Git.stashCreate}) is a valid commit. */
    async isValidStashCommit(commit) {
        try {
            const { localUrl: cwd } = this.opts;
            const { exitCode } = await execa_1.default.command(`git stash show ${commit}`, {
                cwd,
            });
            return exitCode === 0;
        }
        catch {
            // If we can't verify for some reason, just say it's invalid for safety. That way we won't attempt any destructive actions.
            return false;
        }
    }
    /** Applies a stash commit created by {@link Git.stashCreate}.
     *
     * @returns true if the stash applied cleanly, false if there was a merge conflict.
     *  False doesn't mean the stash wasn't applied, just that it conflicted.
     */
    async stashApplyCommit(commit) {
        try {
            await this._execute(`git stash apply ${commit}`);
            return true;
        }
        catch (error) {
            // This can return a non-0 exit code and "fail" just because of merge conflicts.
            if (await this.hasMergeConflicts())
                return false;
            // If it's something else though, do actually fail
            throw error;
        }
    }
    /** Same as `git reset`. If a parameter is passed, it's `git reset --soft` or `git reset --hard`. */
    async reset(resetType) {
        const typeFlag = resetType === undefined ? "" : `--${resetType}`;
        await this._execute(`git reset ${typeFlag}`);
    }
    // === extra commands
    async addAll() {
        await execa_1.default.command(["git add ."].join(" "), {
            shell: true,
            cwd: this.opts.localUrl,
        });
    }
    async getCommitUpTo(commit) {
        const { localUrl: cwd } = this.opts;
        const suffix = commit ? [`${commit}..HEAD`] : [];
        console.log(suffix);
        const { stdout } = await (0, execa_1.default)("git", [`log`, `--pretty=format:'%H'`].concat(suffix), { cwd });
        return stdout
            .split("\n")
            .filter((ent) => !lodash_1.default.isEmpty(ent))
            .map((ent) => lodash_1.default.trim(ent));
    }
    async getCurrentBranch() {
        const { localUrl: cwd } = this.opts;
        try {
            const { stdout } = await (0, execa_1.default)("git", [`rev-parse`, `--abbrev-ref`, `HEAD`], {
                cwd,
            });
            return stdout.trim();
        }
        catch (err) {
            // rev-parse fails if there are no commits, let's try a fallback in that case
            const { stdout } = await (0, execa_1.default)("git", ["symbolic-ref", "-q", "--short", "HEAD"], {
                cwd,
            });
            return stdout.trim();
        }
    }
    async hasChanges(opts) {
        let untrackedFilesArg = "";
        if (opts && opts.untrackedFiles)
            untrackedFilesArg = ` --untracked-files=${opts.untrackedFiles}`;
        const { stdout } = await this._execute(`git status --porcelain${untrackedFilesArg}`);
        return !lodash_1.default.isEmpty(stdout);
    }
    /** Check that local has changes that upstream doesn't. */
    async hasPushableChanges(upstream) {
        return !((await this.diff({
            nameOnly: true,
            oldCommit: upstream,
            newCommit: "HEAD",
        })) === "");
    }
    /** Returns true if there are merge conflicts, caused by a merge or rebase. */
    async hasMergeConflicts() {
        const { stdout } = await this._execute("git status --porcelain");
        return Git.MERGE_CONFLICT_REGEX.test(stdout);
    }
    async hasAccessToRemote() {
        try {
            const { exitCode } = await this._execute("git ls-remote --exit-code");
            return exitCode === 0;
        }
        catch {
            return false;
        }
    }
    /** Gets the path of a file inside of the `.git` folder. */
    getWorkTreePath(...names) {
        const gitRoot = this.opts.localUrl;
        return path_1.default.join(gitRoot, ".git", ...names);
    }
    /** If there's a rebase in progress, returns what type of rebase that is. Otherwise returns `null` if a rebase is **not** in progress.
     *
     * See relevant [git code](https://github.com/git/git/blob/b23dac905bde28da47543484320db16312c87551/wt-status.c#L1666) for which files to check.
     * Thanks to [this amazing answer](https://stackoverflow.com/a/67245016) on StackOverflow.
     *
     * @returns one of the following:
     * - `null` if there is no rebase in progress.
     * - `"interactive"` if there's an interactive rebase (`git rebase --interactive`) in progress.
     * - `"am"` if there's a "mailbox rebase" in progress.
     * - `"regular"` if the 2 special rebase types don't apply, but there is a rebase in progress.
     */
    async typeOfRebaseInProgress() {
        if (await fs_extra_1.default.pathExists(this.getWorkTreePath("rebase-apply"))) {
            if (await fs_extra_1.default.pathExists(this.getWorkTreePath("rebase-apply", "applying"))) {
                return "am";
            }
            else {
                return "regular";
            }
        }
        else if (await fs_extra_1.default.pathExists(this.getWorkTreePath("rebase-merge"))) {
            if (await fs_extra_1.default.pathExists(this.getWorkTreePath("rebase-merge", "interactive"))) {
                return "interactive";
            }
            else {
                return "regular";
            }
        }
        else {
            return null;
        }
    }
    async hasRebaseInProgress() {
        return (await this.typeOfRebaseInProgress()) !== null;
    }
    async hasRemote() {
        const { stdout } = await this._execute("git remote");
        return !lodash_1.default.isEmpty(stdout);
    }
    /** Checks if a push to remote would succeed by checking if the upstream contains commits that the local branch doesn't.  */
    async hasPushableRemote() {
        try {
            // Fetch the remote so we have an up-to-date view of what's on there
            await this.fetch();
            const branch = await this.getCurrentBranch();
            const upstream = await this.getUpstream();
            if (upstream === undefined)
                return false; // no upstream, no push
            const { stdout } = await this._execute(`git branch ${branch} --contains ${upstream}`);
            // If the output is empty, then upstream has something that local doesn't
            // in which case we can't push
            return !lodash_1.default.isEmpty(lodash_1.default.trim(stdout));
        }
        catch {
            // Erring on the side of pushing here.
            // The worst case is that push might get rejected.
            return true;
        }
    }
    /** Gets the upstream `origin/branch` the current branch is set up to push to, or `undefined` if it is not set up to push anywhere. */
    async getUpstream() {
        try {
            const { stdout } = await this._execute("git rev-parse --abbrev-ref @{upstream}");
            return lodash_1.default.trim(stdout);
        }
        catch {
            return undefined;
        }
    }
    /** Returns the first remote that has been configured. */
    async getRemote() {
        // First see if we can determine the correct remote from the upstream of the current branch
        const upstream = await this.getUpstream();
        if (upstream) {
            const upstreamMatch = /^([^/]+)[/].*/.exec(upstream);
            if (upstreamMatch) {
                const remote = upstreamMatch[1];
                if (!lodash_1.default.isEmpty(remote))
                    return remote;
            }
        }
        // If that fails, just default to the first remote the user has.
        try {
            const { stdout } = await this._execute("git remote");
            const remote = lodash_1.default.trim(stdout.split("\n")[0]);
            if (lodash_1.default.isEmpty(remote))
                return undefined;
            return remote;
        }
        catch {
            return undefined;
        }
    }
    /** Returns the URL for the current remote. */
    async getRemoteUrl() {
        const remote = await this.getRemote();
        if (!remote)
            return undefined;
        try {
            const { stdout } = await this._execute(`git remote get-url ${remote}`);
            const url = lodash_1.default.trim(stdout);
            if (lodash_1.default.isEmpty(url))
                return undefined;
            return url;
        }
        catch {
            return undefined;
        }
    }
    /** Returns the number of contributors to this repository, or undefined if this is not a repository. */
    async getNumContributors() {
        try {
            const { stdout } = await this._execute("git shortlog -s HEAD");
            return stdout.split("\n").length;
        }
        catch {
            return undefined;
        }
    }
    /**
     * @param nameOnly: If true, only return the file names. Otherwise the full diff including contents is returned.
     * @param oldCommit: The old identifier (e.g. commit, tag, branch) that we are diffing against.
     * @param newCommit: The new identifier (e.g. commit, tag, branch) that we are diffing from.
     */
    async diff({ nameOnly, oldCommit, newCommit, }) {
        const nameOnlyOption = nameOnly ? "--name-only" : "";
        if (lodash_1.default.isUndefined(oldCommit))
            oldCommit = "";
        if (lodash_1.default.isUndefined(newCommit))
            newCommit = "";
        const { stdout } = await this._execute(`git diff ${nameOnlyOption} ${oldCommit} ${newCommit}`);
        return lodash_1.default.trim(stdout);
    }
    async rm(opts) {
        const args = [];
        if (opts.cached)
            args.push("--cached");
        if (opts.recursive)
            args.push("-r");
        if (opts.force)
            args.push("--force");
        if (opts.dryRun)
            args.push("--dry-run");
        // new vaults are already in .gitignore hence may not be tracked by git.
        args.push("--ignore-unmatch");
        args.push("--", opts.path);
        return (0, execa_1.default)("git rm", args, { cwd: this.opts.localUrl });
    }
}
/** These are the short status symbols git uses to identify files with merge conflicts.
 *
 * See the [git docs](https://www.git-scm.com/docs/git-status#_short_format) for details.
 * The symbol pairs marked "unmerged" are the states that can happen when there is a merge conflict.
 */
Git.MERGE_CONFLICT_REGEX = /^(DD|AA|UU|AU|UA|DU|UD)/;
exports.Git = Git;
//# sourceMappingURL=git.js.map