import { __exportAll } from "../../_virtual/_rolldown/runtime.js";
import { flag, positional, recipe, to_args, value } from "./util/cmd.js";
import { default_origin, discover_name, discover_token, origin_of, parse_origin } from "./util/remote.js";
import { create_work_tree, list_work_trees, remove_work_tree } from "./util/worktree.js";
import { add, branch, checkout, clone, commit, diff, fetch, push, rev_parse, status, tag } from "./cmd.js";
import { Git, Repo, WorkTree } from "./repo.js";
//#region lib/workspace/src/git/index.ts
var git_exports = /* @__PURE__ */ __exportAll({
	Git: () => Git,
	Repo: () => Repo,
	WorkTree: () => WorkTree,
	add: () => add,
	branch: () => branch,
	checkout: () => checkout,
	clone: () => clone,
	commit: () => commit,
	create_work_tree: () => create_work_tree,
	default_origin: () => default_origin,
	diff: () => diff,
	discover_name: () => discover_name,
	discover_token: () => discover_token,
	fetch: () => fetch,
	flag: () => flag,
	list_work_trees: () => list_work_trees,
	origin_of: () => origin_of,
	parse_origin: () => parse_origin,
	positional: () => positional,
	push: () => push,
	recipe: () => recipe,
	remove_work_tree: () => remove_work_tree,
	rev_parse: () => rev_parse,
	status: () => status,
	tag: () => tag,
	to_args: () => to_args,
	value: () => value
});
//#endregion
export { Git, Repo, WorkTree, add, branch, checkout, clone, commit, create_work_tree, default_origin, diff, discover_name, discover_token, fetch, flag, git_exports, list_work_trees, origin_of, parse_origin, positional, push, recipe, remove_work_tree, rev_parse, status, tag, to_args, value };

//# sourceMappingURL=index.js.map