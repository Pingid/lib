import { Recipe } from "../util/recipe.js";
import { Shell } from "../util/shell.js";
import "../util/index.js";
//#region lib/workspace/src/git/cmd.ts
var git = (params, options) => Recipe.create({
	...options,
	cwd: process.cwd()
}, ({ cwd, ...o }) => Shell.sh("git", [...params, ...toArgs(o)], { cwd }).then((r) => r.stdout));
var toArgs = (x) => {
	const args = [];
	for (const [key, value] of Object.entries(x)) {
		if (value === void 0) continue;
		if (typeof value === "boolean") {
			if (value) args.push(`--${getKey(key)}`);
			continue;
		}
		args.push(`--${getKey(key)}`, value);
	}
	return args;
};
var getKey = (key) => key.replace(/_/g, "-");
var commit = git(["commit"], {
	message: "",
	amend: true,
	no_edit: true
});
git(["tag"], { name: "" });
git(["push"], { force: true });
//#endregion
export { commit };

//# sourceMappingURL=cmd.js.map