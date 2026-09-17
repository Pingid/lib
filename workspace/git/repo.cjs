const require_env = require("../util/env.cjs");
const require_shell = require("../util/shell.cjs");
const require_remote = require("./util/remote.cjs");
const require_worktree = require("./util/worktree.cjs");
const require_cmd = require("./cmd.cjs");
//#region lib/workspace/src/git/repo.ts
/**
* A git working directory. Every command is bound to `dir`, so nothing here can quietly act
* on whichever repository the process happens to be sitting in.
*/
var Git = class {
	/** The token to authenticate remotes with. Environment-derived, so it is not per-checkout. */
	static token = () => require_remote.discover_token();
	dir;
	constructor(dir) {
		this.dir = dir;
	}
	/** Stage `pathspec`, or everything when none is given. */
	add = (...pathspec) => pathspec.length ? require_cmd.add({
		cwd: this.dir,
		pathspec
	}) : require_cmd.add({
		cwd: this.dir,
		all: true
	});
	commit = (message) => require_cmd.commit({
		cwd: this.dir,
		message
	});
	tag = (name, ref) => require_cmd.tag({
		cwd: this.dir,
		name,
		ref
	});
	push = (remote, ...refspec) => require_cmd.push({
		cwd: this.dir,
		remote,
		refspec
	});
	fetch = (remote, ...refspec) => require_cmd.fetch({
		cwd: this.dir,
		remote,
		refspec
	});
	branch = (name, start) => require_cmd.branch({
		cwd: this.dir,
		name,
		start
	});
	checkout = (ref) => require_cmd.checkout({
		cwd: this.dir,
		ref
	});
	status = () => require_cmd.status({ cwd: this.dir });
	diff = (ref) => require_cmd.diff({
		cwd: this.dir,
		ref
	});
	rev_parse = (ref) => require_cmd.rev_parse({
		cwd: this.dir,
		ref
	});
	/** Escape hatch for anything without a recipe. Resolves with trimmed stdout. */
	git = (...args) => require_shell.Shell.sho("git", args, { cwd: this.dir });
	/** The absolute path of the working tree root, which `dir` may be a subdirectory of. */
	root = () => this.git("rev-parse", "--show-toplevel");
	/** The commit a ref resolves to. */
	head = (ref = "HEAD") => this.git("rev-parse", ref);
	/** The checked-out branch, or `HEAD` when detached. */
	current_branch = () => this.git("rev-parse", "--abbrev-ref", "HEAD");
	/** Tag names, optionally narrowed by a glob such as `build-*`. */
	tags = (filter) => this.git("tag", "--list", ...filter ? [filter] : []).then(lines);
	/** Local branch names. */
	branches = () => this.git("for-each-ref", "--format=%(refname:short)", "refs/heads").then(lines);
	/** Whether a ref exists and resolves. */
	has = (ref) => require_shell.Shell.ok("git", [
		"rev-parse",
		"--verify",
		"--quiet",
		ref
	], { cwd: this.dir });
	/** Whether the working tree has any change at all, staged or not, tracked or not. */
	dirty = () => this.git("status", "--porcelain").then((out) => out.length > 0);
	/** Whether anything is staged — the question `git diff --cached --quiet` answers by exit code. */
	staged = async () => {
		const r = await require_shell.Shell.run("git", [
			"diff",
			"--cached",
			"--quiet"
		], { cwd: this.dir });
		if (r.code === 0) return false;
		if (r.code === 1) return true;
		throw new require_shell.ShellError(r);
	};
	/** The URL of a remote, `origin` by default. */
	remote_url = (name = "origin") => this.git("remote", "get-url", name);
	/** Every worktree attached to this repository, the main one first. */
	worktrees = () => require_worktree.list_work_trees(this.dir);
};
var lines = (out) => out.split("\n").map((x) => x.trim()).filter(Boolean);
/** A checkout that also knows which remote repository it is, and at what commit. */
var Repo = class Repo extends Git {
	/**
	* Identify the repository containing `dir` (the process directory by default), taking the
	* name from CI, the `origin` remote or `gh`, in that order. Anything passed explicitly wins.
	*/
	static async discover(p = {}) {
		const from = p.dir ?? process.cwd();
		const dir = await require_shell.Shell.sho("git", ["rev-parse", "--show-toplevel"], { cwd: from }).catch(() => void 0);
		if (!dir) throw new Error(`Not a git repository: ${from}`);
		const named = p.owner && p.repo ? void 0 : await require_remote.discover_name(dir);
		const owner = p.owner || named?.owner;
		const repo = p.repo || named?.repo;
		if (!owner || !repo) throw new Error("Could not determine GitHub owner/repo. Set GITHUB_REPOSITORY or add an `origin` remote.");
		const ref = p.ref || require_env.env("GITHUB_SHA") || await require_shell.Shell.sho("git", ["rev-parse", "HEAD"], { cwd: dir });
		return new Repo(owner, repo, ref, dir);
	}
	owner;
	repo;
	/** The commit (or branch, for a worktree) this instance stands for. */
	ref;
	constructor(owner, repo, ref, dir) {
		super(dir);
		this.owner = owner;
		this.repo = repo;
		this.ref = ref;
	}
	/** `owner/repo`. */
	get name() {
		return `${this.owner}/${this.repo}`;
	}
	/** The URL to push to: this checkout's `origin` when it matches, else the canonical one. */
	origin() {
		return require_remote.origin_of(this.owner, this.repo, this.dir);
	}
	/** Check `branch` out into its own directory, branching from this ref if it is new. */
	worktree(branch, opts = {}) {
		return WorkTree.create(this, branch, opts);
	}
};
/**
* A second checkout of the same repository on another branch, so a build can be committed
* without disturbing the tree you are working in.
*/
var WorkTree = class WorkTree extends Repo {
	base;
	static async create(base, branch, opts = {}) {
		const dir = await require_worktree.create_work_tree({
			cwd: base.dir,
			base: base.ref,
			branch,
			path: opts.path,
			force: opts.force ?? true
		});
		return new WorkTree(base, new Repo(base.owner, base.repo, branch, dir));
	}
	constructor(base, tree) {
		super(tree.owner, tree.repo, tree.ref, tree.dir);
		this.base = base;
	}
	/** Detach the worktree and delete its directory. The branch itself is kept. */
	async remove(force = true) {
		await require_worktree.remove_work_tree(this.dir, {
			cwd: this.base.dir,
			force
		});
	}
	/** `await using tree = await repo.worktree('pkg')` cleans up however the block exits. */
	async [Symbol.asyncDispose]() {
		await this.remove();
	}
};
//#endregion
exports.Git = Git;
exports.Repo = Repo;
exports.WorkTree = WorkTree;

//# sourceMappingURL=repo.cjs.map