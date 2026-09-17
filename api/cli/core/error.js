//#region lib/api/src/cli/core/error.ts
/**
* A failure caused by the invocation rather than the handler. These are reported
* as `error: <message>` plus a usage hint; anything else propagates untouched.
*/
var CliError = class CliError extends Error {
	code;
	exit;
	/** Attached by whoever has it — an `Arg` decoding a token does not know its command. */
	cmd;
	constructor(message, options = {}) {
		super(message);
		this.name = "CliError";
		this.code = options.code ?? "invalid-value";
		this.cmd = options.cmd;
		this.exit = options.exit ?? 1;
	}
	/** Fills in the command if it is not already known. Returns itself, to rethrow. */
	at(cmd) {
		this.cmd ??= cmd;
		return this;
	}
	/** One line per path, outermost only — nested failures repeat the same root cause. */
	static fromIssues(issues, cmd) {
		const seen = /* @__PURE__ */ new Set();
		const lines = [];
		for (const issue of issues) {
			if (seen.has(issue.path)) continue;
			seen.add(issue.path);
			lines.push(issue.path ? `${issue.path}: ${issue.message}` : issue.message);
		}
		return new CliError(lines.join("\n"), {
			code: "invalid-value",
			...cmd ? { cmd } : {}
		});
	}
};
//#endregion
export { CliError };

//# sourceMappingURL=error.js.map