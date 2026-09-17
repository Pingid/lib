const require_runtime = require("../../../_virtual/_rolldown/runtime.cjs");
const require_shell = require("../../util/shell.cjs");
let node_path = require("node:path");
node_path = require_runtime.__toESM(node_path, 1);
let node_fs_promises = require("node:fs/promises");
//#region lib/workspace/src/git/util/worktree.ts
/**
* Check `branch` out into its own directory, creating the branch from `base` if it is new.
*
* Returns the resolved path: git records a worktree by its real path, so anything derived
* from a symlinked one (`/tmp` on macOS) would not match what `git worktree list` reports.
*/
var create_work_tree = async (opts) => {
	const dir = node_path.default.resolve(opts.cwd, opts.path ?? node_path.default.join(".worktrees", slug(opts.branch)));
	if (opts.force) {
		await remove_work_tree(dir, {
			cwd: opts.cwd,
			force: true
		}).catch(() => {});
		await (0, node_fs_promises.rm)(dir, {
			recursive: true,
			force: true
		});
		await require_shell.Shell.run("git", ["worktree", "prune"], { cwd: opts.cwd });
	}
	if (!await require_shell.Shell.ok("git", [
		"rev-parse",
		"--verify",
		"--quiet",
		`refs/heads/${opts.branch}`
	], { cwd: opts.cwd })) await require_shell.Shell.sho("git", [
		"branch",
		opts.branch,
		opts.base
	], { cwd: opts.cwd });
	await require_shell.Shell.sho("git", [
		"worktree",
		"add",
		dir,
		opts.branch
	], { cwd: opts.cwd });
	return (0, node_fs_promises.realpath)(dir);
};
var remove_work_tree = async (dir, opts = {}) => {
	await require_shell.Shell.sho("git", [
		"worktree",
		"remove",
		dir,
		...opts.force ? ["--force"] : []
	], { cwd: opts.cwd });
};
/** The worktrees attached to the repository at `cwd`, the first being the main one. */
var list_work_trees = async (cwd) => {
	return (await require_shell.Shell.sho("git", [
		"worktree",
		"list",
		"--porcelain"
	], { cwd })).split(/\n\s*\n/).map(parse_work_tree).filter((x) => x !== void 0);
};
/** Records are `key value` lines, with bare keys for the boolean states. */
var parse_work_tree = (block) => {
	const fields = /* @__PURE__ */ new Map();
	for (const line of block.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		const at = trimmed.indexOf(" ");
		if (at === -1) fields.set(trimmed, "");
		else fields.set(trimmed.slice(0, at), trimmed.slice(at + 1));
	}
	const dir = fields.get("worktree");
	if (!dir) return void 0;
	const branch = fields.get("branch");
	return {
		path: dir,
		head: fields.get("HEAD"),
		branch: branch?.replace(/^refs\/heads\//, ""),
		bare: fields.has("bare"),
		detached: fields.has("detached"),
		locked: fields.has("locked"),
		prunable: fields.has("prunable")
	};
};
/** Branch names may contain `/`, which would otherwise nest the default directory. */
var slug = (branch) => branch.replace(/[^\w.-]+/g, "-");
//#endregion
exports.create_work_tree = create_work_tree;
exports.list_work_trees = list_work_trees;
exports.remove_work_tree = remove_work_tree;

//# sourceMappingURL=worktree.cjs.map