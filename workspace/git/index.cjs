const require_runtime = require("../../_virtual/_rolldown/runtime.cjs");
const require_repo = require("./repo.cjs");
//#region lib/workspace/src/git/index.ts
var git_exports = /* @__PURE__ */ require_runtime.__exportAll({
	Repo: () => require_repo.Repo,
	WorkTree: () => require_repo.WorkTree
});
//#endregion
exports.Repo = require_repo.Repo;
exports.WorkTree = require_repo.WorkTree;
Object.defineProperty(exports, "git_exports", {
	enumerable: true,
	get: function() {
		return git_exports;
	}
});

//# sourceMappingURL=index.cjs.map