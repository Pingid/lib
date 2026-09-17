const require_runtime = require("../../_virtual/_rolldown/runtime.cjs");
const require_shell = require("../util/shell.cjs");
require("../util/index.cjs");
const require_cmd = require("./cmd.cjs");
let node_path = require("node:path");
node_path = require_runtime.__toESM(node_path, 1);
let node_fs_promises = require("node:fs/promises");
//#region lib/workspace/src/git/repo.ts
var Repo = class Repo {
	static async discover(p = {}) {
		const d = p.owner && p.repo ? void 0 : await discover_name();
		const owner = p.owner || d?.owner;
		const repo = p.repo || d?.repo;
		const dir = p.dir || node_path.default.resolve((await require_shell.Shell.sho("git", ["rev-parse", "--git-dir"])).trim(), "..");
		if (!owner || !repo) throw new Error("Could not determine GitHub owner/repo");
		const ref = p.ref || env("GITHUB_SHA") || await require_shell.Shell.sho("git", ["rev-parse", "HEAD"]);
		return new Repo(owner, repo, ref, dir);
	}
	owner;
	repo;
	ref;
	dir;
	constructor(owner, repo, ref, dir) {
		this.owner = owner;
		this.repo = repo;
		this.ref = ref;
		this.dir = dir;
	}
	token() {
		return discover_token();
	}
	origin() {
		return origin_of(this.owner, this.repo);
	}
	tags(filter) {
		return require_shell.Shell.sho("git", [
			"tag",
			"--list",
			...filter ? [filter] : []
		], { cwd: this.dir }).then((lines) => lines.split("\n").filter(Boolean));
	}
	commit = (msg) => require_cmd.commit({
		cwd: this.dir,
		message: msg
	});
};
var WorkTree = class WorkTree extends Repo {
	base;
	static async create(base, branch, path) {
		const pth = await create_work_tree({
			base: base.ref,
			branch,
			path,
			force: true
		});
		return new WorkTree(base, new Repo(base.owner, base.repo, branch, pth));
	}
	constructor(base, tree) {
		super(tree.owner, tree.repo, tree.ref, tree.dir);
		this.base = base;
	}
	async remove(force = true) {
		await remove_work_tree(this.dir, force);
	}
};
var create_work_tree = async (opts) => {
	const pth = opts.path || root(".worktrees", opts.branch);
	if (opts.force) {
		await remove_work_tree(pth, true).catch(() => {});
		await require_shell.Shell.sho("git", ["worktree", "prune"]).catch(() => {});
		await (0, node_fs_promises.rm)(pth, {
			recursive: true,
			force: true
		});
	}
	if (!await require_shell.Shell.sho("git", [
		"rev-parse",
		"--verify",
		`refs/heads/${opts.branch}`
	]).then(() => true, () => false)) await require_shell.Shell.sho("git", [
		"branch",
		opts.branch,
		opts.base
	]);
	await require_shell.Shell.sho("git", [
		"worktree",
		"add",
		pth,
		opts.branch
	]);
	return pth;
};
var root = (...parts) => node_path.default.join(env("GITHUB_WORKSPACE") || process.cwd(), ...parts);
var remove_work_tree = async (path, force) => {
	await require_shell.Shell.sho("git", [
		"worktree",
		"remove",
		path,
		...force ? ["--force"] : []
	]);
};
var discover_token = async () => {
	const token = env("GITHUB_TOKEN") || env("GH_TOKEN") || await require_shell.Shell.sho("gh", ["auth", "token"]).catch(() => "");
	if (!token) throw new Error("GitHub token not found. Set GITHUB_TOKEN or run `gh auth login`.");
	return token;
};
var discover_name = async () => {
	const e = env("GITHUB_REPOSITORY") || env("GH_REPO");
	if (e) return parse_origin(e);
	try {
		return parse_origin(await require_shell.Shell.sho("git", [
			"remote",
			"get-url",
			"origin"
		]));
	} catch {}
	return parse_origin(JSON.parse(await require_shell.Shell.sho("gh", [
		"repo",
		"view",
		"--json",
		"nameWithOwner"
	])).nameWithOwner);
};
var env = (name) => process.env[name];
var origin_of = async (owner, repo) => {
	try {
		const parsed = parse_origin(await require_shell.Shell.sho("git", [
			"remote",
			"get-url",
			"origin"
		]));
		if (parsed?.owner === owner && parsed?.repo === repo) return parsed.origin;
	} catch {}
	return default_origin(owner, repo);
};
var default_origin = (owner, repo) => `${(env("GITHUB_SERVER_URL") || "https://github.com").replace(/\/$/, "")}/${owner}/${repo}.git`;
var parse_origin = (url) => {
	const origin = url.trim().replace(/\/$/, "");
	const full = origin.match(/^(?:https?:\/\/|git@|ssh:\/\/git@)([^/:]+)[:/]([^/]+)\/([^/]+?)(?:\.git)?$/);
	if (full) return {
		owner: full[2],
		repo: full[3],
		origin
	};
	const name = origin.match(/^([^/]+)\/([^/]+)$/);
	if (name) return {
		owner: name[1],
		repo: name[2],
		origin: default_origin(name[1], name[2])
	};
};
//#endregion
exports.Repo = Repo;
exports.WorkTree = WorkTree;

//# sourceMappingURL=repo.cjs.map