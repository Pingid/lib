const require_env = require("../../util/env.cjs");
const require_shell = require("../../util/shell.cjs");
//#region lib/workspace/src/git/util/remote.ts
/**
* The token to authenticate with, from the environment or from a signed-in `gh`.
* Throws rather than returning an empty string, since every caller needs a real one.
*/
var discover_token = async () => {
	const token = require_env.env("GITHUB_TOKEN") || require_env.env("GH_TOKEN") || await require_shell.Shell.sho("gh", ["auth", "token"]).catch(() => "");
	if (!token) throw new Error("GitHub token not found. Set GITHUB_TOKEN or run `gh auth login`.");
	return token;
};
/**
* Work out which repository `cwd` belongs to: what CI says, else the `origin` remote,
* else whatever `gh` believes. Returns `undefined` when none of them can answer, leaving
* the decision of how loudly to fail to the caller.
*/
var discover_name = async (cwd) => {
	const e = require_env.env("GITHUB_REPOSITORY") || require_env.env("GH_REPO");
	if (e) return parse_origin(e);
	const remote = await require_shell.Shell.sho("git", [
		"remote",
		"get-url",
		"origin"
	], { cwd }).catch(() => void 0);
	const parsed = remote ? parse_origin(remote) : void 0;
	if (parsed) return parsed;
	const gh = await require_shell.Shell.sho("gh", [
		"repo",
		"view",
		"--json",
		"nameWithOwner"
	], { cwd }).catch(() => void 0);
	if (!gh) return void 0;
	try {
		return parse_origin(JSON.parse(gh).nameWithOwner);
	} catch {
		return;
	}
};
/**
* The URL to push to for `owner/repo`. Prefers the checkout's own `origin`, so a fork, a
* mirror or an SSH remote is kept, and only falls back to the canonical URL when `origin`
* points somewhere else entirely.
*/
var origin_of = async (owner, repo, cwd) => {
	const remote = await require_shell.Shell.sho("git", [
		"remote",
		"get-url",
		"origin"
	], { cwd }).catch(() => void 0);
	const parsed = remote ? parse_origin(remote) : void 0;
	if (parsed?.owner === owner && parsed.repo === repo) return parsed.origin;
	return default_origin(owner, repo);
};
/** The canonical URL for `owner/repo` on the configured server. */
var default_origin = (owner, repo) => `${(require_env.env("GITHUB_SERVER_URL") || "https://github.com").replace(/\/+$/, "")}/${owner}/${repo}.git`;
/**
* Parse anything that names a repository: `owner/repo`, `https://host/owner/repo.git`,
* `git@host:owner/repo`, `ssh://git@host:2222/owner/repo.git`.
*
* The owner is the segment before the repository, so a nested group (`group/sub/repo`)
* reports `sub` — which is what the GitHub-shaped APIs this is fed to expect.
*/
var parse_origin = (url) => {
	const trimmed = url.trim().replace(/\/+$/, "");
	if (!trimmed) return void 0;
	if (!/:\/\/|@/.test(trimmed)) {
		const short = trimmed.match(/^([^/\s:]+)\/([^/\s:]+?)(?:\.git)?$/);
		if (short) return {
			owner: short[1],
			repo: short[2],
			origin: default_origin(short[1], short[2])
		};
	}
	const url_ = trimmed.match(/^(?:[a-z][a-z0-9+.-]*:\/\/)?(?:[^@/]+@)?[^/:]+(?::\d+)?[:/](.+?)(?:\.git)?$/i);
	if (!url_) return void 0;
	const parts = url_[1].split("/").filter(Boolean);
	const repo = parts.pop();
	const owner = parts.pop();
	if (!owner || !repo) return void 0;
	return {
		owner,
		repo,
		origin: trimmed
	};
};
//#endregion
exports.default_origin = default_origin;
exports.discover_name = discover_name;
exports.discover_token = discover_token;
exports.origin_of = origin_of;
exports.parse_origin = parse_origin;

//# sourceMappingURL=remote.cjs.map