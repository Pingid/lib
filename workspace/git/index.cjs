const require_runtime = require("../../_virtual/_rolldown/runtime.cjs");
const require_cmd = require("./util/cmd.cjs");
const require_remote = require("./util/remote.cjs");
const require_worktree = require("./util/worktree.cjs");
const require_cmd$1 = require("./cmd.cjs");
const require_repo = require("./repo.cjs");
//#region lib/workspace/src/git/index.ts
var git_exports = /* @__PURE__ */ require_runtime.__exportAll({
	Git: () => require_repo.Git,
	Repo: () => require_repo.Repo,
	WorkTree: () => require_repo.WorkTree,
	add: () => require_cmd$1.add,
	branch: () => require_cmd$1.branch,
	checkout: () => require_cmd$1.checkout,
	clone: () => require_cmd$1.clone,
	commit: () => require_cmd$1.commit,
	create_work_tree: () => require_worktree.create_work_tree,
	default_origin: () => require_remote.default_origin,
	diff: () => require_cmd$1.diff,
	discover_name: () => require_remote.discover_name,
	discover_token: () => require_remote.discover_token,
	fetch: () => require_cmd$1.fetch,
	flag: () => require_cmd.flag,
	list_work_trees: () => require_worktree.list_work_trees,
	origin_of: () => require_remote.origin_of,
	parse_origin: () => require_remote.parse_origin,
	positional: () => require_cmd.positional,
	push: () => require_cmd$1.push,
	recipe: () => require_cmd.recipe,
	remove_work_tree: () => require_worktree.remove_work_tree,
	rev_parse: () => require_cmd$1.rev_parse,
	status: () => require_cmd$1.status,
	tag: () => require_cmd$1.tag,
	to_args: () => require_cmd.to_args,
	value: () => require_cmd.value
});
//#endregion
exports.Git = require_repo.Git;
exports.Repo = require_repo.Repo;
exports.WorkTree = require_repo.WorkTree;
exports.add = require_cmd$1.add;
exports.branch = require_cmd$1.branch;
exports.checkout = require_cmd$1.checkout;
exports.clone = require_cmd$1.clone;
exports.commit = require_cmd$1.commit;
exports.create_work_tree = require_worktree.create_work_tree;
exports.default_origin = require_remote.default_origin;
exports.diff = require_cmd$1.diff;
exports.discover_name = require_remote.discover_name;
exports.discover_token = require_remote.discover_token;
exports.fetch = require_cmd$1.fetch;
exports.flag = require_cmd.flag;
Object.defineProperty(exports, "git_exports", {
	enumerable: true,
	get: function() {
		return git_exports;
	}
});
exports.list_work_trees = require_worktree.list_work_trees;
exports.origin_of = require_remote.origin_of;
exports.parse_origin = require_remote.parse_origin;
exports.positional = require_cmd.positional;
exports.push = require_cmd$1.push;
exports.recipe = require_cmd.recipe;
exports.remove_work_tree = require_worktree.remove_work_tree;
exports.rev_parse = require_cmd$1.rev_parse;
exports.status = require_cmd$1.status;
exports.tag = require_cmd$1.tag;
exports.to_args = require_cmd.to_args;
exports.value = require_cmd.value;

//# sourceMappingURL=index.cjs.map