import { flag, positional, recipe, value } from "./util/cmd.js";
//#region lib/workspace/src/git/cmd.ts
/**
* The git subcommands as lazy builders. Each takes the options it should start with and
* returns a chainable, awaitable recipe resolving to the command's stdout:
*
* ```ts
* await commit({ cwd }).message('release').amend().no_edit()
* ```
*
* Every builder also accepts `.cwd(dir)`, which selects the repository rather than being
* passed to git.
*/
var AddOpts = {
	all: flag(),
	force: flag(),
	update: flag(),
	pathspec: positional()
};
var add = recipe(["add"], AddOpts);
var CommitOpts = {
	message: value(),
	all: flag(),
	amend: flag(),
	no_edit: flag(),
	no_verify: flag(),
	allow_empty: flag()
};
var commit = recipe(["commit"], CommitOpts);
var TagOpts = {
	message: value(),
	annotate: flag(),
	force: flag(),
	delete: flag(),
	list: flag(),
	name: positional(),
	ref: positional()
};
var tag = recipe(["tag"], TagOpts);
var PushOpts = {
	force: flag(),
	tags: flag(),
	delete: flag(),
	set_upstream: flag(),
	dry_run: flag(),
	remote: positional(),
	refspec: positional()
};
var push = recipe(["push"], PushOpts);
var FetchOpts = {
	all: flag(),
	prune: flag(),
	tags: flag(),
	depth: value(),
	remote: positional(),
	refspec: positional()
};
var fetch = recipe(["fetch"], FetchOpts);
var BranchOpts = {
	list: flag(),
	force: flag(),
	delete: flag(),
	move: flag(),
	name: positional(),
	start: positional()
};
var branch = recipe(["branch"], BranchOpts);
var CheckoutOpts = {
	create: value("-b"),
	force: flag(),
	detach: flag(),
	ref: positional()
};
var checkout = recipe(["checkout"], CheckoutOpts);
var StatusOpts = {
	porcelain: flag(),
	short: flag(),
	branch: flag(),
	pathspec: positional()
};
var status = recipe(["status"], StatusOpts);
var DiffOpts = {
	cached: flag(),
	name_only: flag(),
	stat: flag(),
	ref: positional(),
	pathspec: positional()
};
var diff = recipe(["diff"], DiffOpts);
var RevParseOpts = {
	verify: flag(),
	quiet: flag(),
	short: flag(),
	abbrev_ref: flag(),
	show_toplevel: flag(),
	git_dir: flag(),
	ref: positional()
};
var rev_parse = recipe(["rev-parse"], RevParseOpts);
var CloneOpts = {
	depth: value(),
	branch: value(),
	single_branch: flag(),
	bare: flag(),
	url: positional(),
	dir: positional()
};
recipe(["clone"], CloneOpts);
//#endregion
export { add, branch, checkout, commit, diff, fetch, push, rev_parse, status, tag };

//# sourceMappingURL=cmd.js.map