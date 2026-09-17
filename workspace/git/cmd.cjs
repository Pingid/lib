const require_cmd = require("./util/cmd.cjs");
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
	all: require_cmd.flag(),
	force: require_cmd.flag(),
	update: require_cmd.flag(),
	pathspec: require_cmd.positional()
};
var add = require_cmd.recipe(["add"], AddOpts);
var CommitOpts = {
	message: require_cmd.value(),
	all: require_cmd.flag(),
	amend: require_cmd.flag(),
	no_edit: require_cmd.flag(),
	no_verify: require_cmd.flag(),
	allow_empty: require_cmd.flag()
};
var commit = require_cmd.recipe(["commit"], CommitOpts);
var TagOpts = {
	message: require_cmd.value(),
	annotate: require_cmd.flag(),
	force: require_cmd.flag(),
	delete: require_cmd.flag(),
	list: require_cmd.flag(),
	name: require_cmd.positional(),
	ref: require_cmd.positional()
};
var tag = require_cmd.recipe(["tag"], TagOpts);
var PushOpts = {
	force: require_cmd.flag(),
	tags: require_cmd.flag(),
	delete: require_cmd.flag(),
	set_upstream: require_cmd.flag(),
	dry_run: require_cmd.flag(),
	remote: require_cmd.positional(),
	refspec: require_cmd.positional()
};
var push = require_cmd.recipe(["push"], PushOpts);
var FetchOpts = {
	all: require_cmd.flag(),
	prune: require_cmd.flag(),
	tags: require_cmd.flag(),
	depth: require_cmd.value(),
	remote: require_cmd.positional(),
	refspec: require_cmd.positional()
};
var fetch = require_cmd.recipe(["fetch"], FetchOpts);
var BranchOpts = {
	list: require_cmd.flag(),
	force: require_cmd.flag(),
	delete: require_cmd.flag(),
	move: require_cmd.flag(),
	name: require_cmd.positional(),
	start: require_cmd.positional()
};
var branch = require_cmd.recipe(["branch"], BranchOpts);
var CheckoutOpts = {
	create: require_cmd.value("-b"),
	force: require_cmd.flag(),
	detach: require_cmd.flag(),
	ref: require_cmd.positional()
};
var checkout = require_cmd.recipe(["checkout"], CheckoutOpts);
var StatusOpts = {
	porcelain: require_cmd.flag(),
	short: require_cmd.flag(),
	branch: require_cmd.flag(),
	pathspec: require_cmd.positional()
};
var status = require_cmd.recipe(["status"], StatusOpts);
var DiffOpts = {
	cached: require_cmd.flag(),
	name_only: require_cmd.flag(),
	stat: require_cmd.flag(),
	ref: require_cmd.positional(),
	pathspec: require_cmd.positional()
};
var diff = require_cmd.recipe(["diff"], DiffOpts);
var RevParseOpts = {
	verify: require_cmd.flag(),
	quiet: require_cmd.flag(),
	short: require_cmd.flag(),
	abbrev_ref: require_cmd.flag(),
	show_toplevel: require_cmd.flag(),
	git_dir: require_cmd.flag(),
	ref: require_cmd.positional()
};
var rev_parse = require_cmd.recipe(["rev-parse"], RevParseOpts);
var CloneOpts = {
	depth: require_cmd.value(),
	branch: require_cmd.value(),
	single_branch: require_cmd.flag(),
	bare: require_cmd.flag(),
	url: require_cmd.positional(),
	dir: require_cmd.positional()
};
var clone = require_cmd.recipe(["clone"], CloneOpts);
//#endregion
exports.add = add;
exports.branch = branch;
exports.checkout = checkout;
exports.clone = clone;
exports.commit = commit;
exports.diff = diff;
exports.fetch = fetch;
exports.push = push;
exports.rev_parse = rev_parse;
exports.status = status;
exports.tag = tag;

//# sourceMappingURL=cmd.cjs.map