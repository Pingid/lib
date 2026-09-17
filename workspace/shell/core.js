import { spawn } from "node:child_process";
import log from "@lickle/trace/log";
//#region lib/workspace/src/shell/core.ts
/**
* A command that ran and failed. The whole {@link ShellResult} is attached as `result`,
* because callers routinely need the exit code or the output that came before the failure.
*
* Deliberately has no `code` of its own: a command that could not be started at all rejects
* with Node's spawn error instead, whose `code` is a string such as `'ENOENT'`. Keeping the
* exit status under `result.code` keeps the two failures distinguishable.
*/
var ShellError = class extends Error {
	result;
	constructor(result) {
		const how = result.signal ? `killed by ${result.signal}` : `exit ${result.code}`;
		const why = result.stderr || result.stdout;
		super(`${result.cmd} ${result.args.join(" ")} failed (${how})${why ? `: ${why}` : ""}`);
		this.name = "ShellError";
		this.result = result;
	}
};
var l = log.target("workspace:shell");
var runSpawned = (cmd, args, options = {}) => {
	const { cwd, env, input, timeout, signal = "SIGTERM", stdio = "pipe" } = options;
	const sp = l.span.trace("shell", {
		cmd,
		args,
		cwd,
		stdio
	});
	l.debug(`${cmd} ${args.join(" ")}`);
	const proc = spawn(cmd, args, {
		cwd,
		stdio: [
			input !== void 0 ? "pipe" : stdio,
			stdio,
			stdio
		],
		env: env ? {
			...process.env,
			...env
		} : process.env
	});
	const stdout = [];
	const stderr = [];
	proc.stdout?.on("data", (data) => stdout.push(data));
	proc.stderr?.on("data", (data) => stderr.push(data));
	if (input !== void 0) proc.stdin?.end(input);
	else proc.stdin?.end();
	const timer = timeout === void 0 ? void 0 : setTimeout(() => proc.kill(signal), timeout);
	const join = (buffers) => Buffer.concat(buffers).toString("utf-8").trim();
	return new Promise((resolve, reject) => {
		proc.on("close", (code, killed) => {
			sp.setFields({
				code,
				signal: killed
			});
			resolve({
				cmd,
				args,
				stdout: join(stdout),
				stderr: join(stderr),
				code,
				signal: killed
			});
		});
		proc.on("error", (error) => reject(error));
	}).finally(() => {
		clearTimeout(timer);
		sp.end();
	});
};
var ShellMacro = (cb) => {
	const f = (t, ...rest) => {
		if (is_template(t)) {
			const [cmd, ...args] = parse_template(t, rest);
			if (!cmd) return Promise.reject(/* @__PURE__ */ new TypeError("shell: empty command"));
			return cb(cmd, args, {});
		}
		if (typeof t === "string") return cb(t, rest[0] ?? [], rest[1] ?? {});
		const preset = t;
		return ShellMacro((cmd, args, o) => cb(cmd, args, {
			...preset,
			...o
		}));
	};
	return f;
};
/**
* Split a template into a command and its arguments without a shell.
*
* Literal text splits on whitespace. Each interpolated value stays part of the word it sits
* in, however many spaces it contains, so ``git commit -m ${msg}`` passes `msg` as one
* argument and ``--name=${v}`` stays a single `--name=…` argument. An array interpolation
* spreads into one argument per element (and ends any word it touches); an empty-string
* interpolation is kept as an empty argument.
*/
var parse_template = (t, vals) => {
	const out = [];
	let word = null;
	const flush = () => {
		if (word !== null) out.push(word);
		word = null;
	};
	t.raw.forEach((text, i) => {
		for (const ch of text) if (/\s/.test(ch)) flush();
		else word = (word ?? "") + ch;
		if (i < vals.length) {
			const v = vals[i];
			if (Array.isArray(v)) {
				flush();
				out.push(...v.map(String));
			} else word = (word ?? "") + String(v);
		}
	});
	flush();
	return out;
};
var is_template = (t) => t !== null && typeof t === "object" && "raw" in t;
//#endregion
export { ShellError, ShellMacro, runSpawned };

//# sourceMappingURL=core.js.map