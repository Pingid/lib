import { cli, flag, positional, value } from "../tcli/tcli.js";
//#region lib/workspace/src/git/cmd.ts
var recipe = cli("git");
var add = recipe(["add"], {
	all: flag(),
	force: flag(),
	update: flag(),
	pathspec: positional()
});
var commit = recipe(["commit"], {
	message: value(),
	all: flag(),
	amend: flag(),
	no_edit: flag(),
	no_verify: flag(),
	allow_empty: flag()
});
var tag = recipe(["tag"], {
	message: value(),
	annotate: flag(),
	force: flag(),
	delete: flag(),
	list: flag(),
	name: positional(),
	ref: positional()
});
var push = recipe(["push"], {
	force: flag(),
	tags: flag(),
	delete: flag(),
	set_upstream: flag(),
	dry_run: flag(),
	remote: positional(),
	refspec: positional()
});
var fetch = recipe(["fetch"], {
	all: flag(),
	prune: flag(),
	tags: flag(),
	depth: value(),
	remote: positional(),
	refspec: positional()
});
var branch = recipe(["branch"], {
	list: flag(),
	force: flag(),
	delete: flag(),
	move: flag(),
	name: positional(),
	start: positional()
});
var checkout = recipe(["checkout"], {
	create: value("-b"),
	force: flag(),
	detach: flag(),
	ref: positional()
});
var status = recipe(["status"], {
	porcelain: flag(),
	short: flag(),
	branch: flag(),
	pathspec: positional()
});
var diff = recipe(["diff"], {
	cached: flag(),
	name_only: flag(),
	stat: flag(),
	ref: positional(),
	pathspec: positional()
});
var rev_parse = recipe(["rev-parse"], {
	verify: flag(),
	quiet: flag(),
	short: flag(),
	abbrev_ref: flag(),
	show_toplevel: flag(),
	git_dir: flag(),
	ref: positional()
});
recipe(["clone"], {
	depth: value(),
	branch: value(),
	single_branch: flag(),
	bare: flag(),
	url: positional(),
	dir: positional()
});
//#endregion
export { add, branch, checkout, commit, diff, fetch, push, rev_parse, status, tag };

//# sourceMappingURL=cmd.js.map