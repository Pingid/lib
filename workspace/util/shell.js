import { spawn } from "node:child_process";
import log from "@lickle/trace/log";
//#region lib/workspace/src/util/shell.ts
/**
* A command that ran and failed. The whole {@link ShellResult} is attached, because
* callers routinely need the exit code or the output that came before the failure.
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
	get code() {
		return this.result.code;
	}
	get stdout() {
		return this.result.stdout;
	}
	get stderr() {
		return this.result.stderr;
	}
};
var l = log.target("workspace:shell");
var make_macro = (cb) => {
	const f = (t, ...arg) => {
		if (is_template(t)) {
			const [cmd, ...args] = String.raw(t, ...arg).split(" ");
			return cb(cmd, args, {});
		}
		if (typeof t === "string") return cb(t, arg[0], arg[1] ?? {});
		return make_macro((cmd, args, o) => cb(cmd, args, {
			...t,
			...o
		}));
	};
	return f;
};
var is_template = (t) => t !== null && typeof t === "object" && "raw" in t;
var Shell = class Shell {
	/**
	* Run a command and resolve with its result whatever the exit status. Rejects only when
	* the child could not be started at all, so a non-zero exit stays inspectable — the shape
	* commands like `git diff --quiet` need, where the status *is* the answer.
	*/
	static run = (cmd, args, options = {}) => {
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
		const join = (buffers) => buffers.map((b) => b.toString("utf-8")).join("").trim();
		return new Promise((resolve, reject) => {
			proc.on("close", (code, killed) => {
				const result = {
					cmd,
					args,
					stdout: join(stdout),
					stderr: join(stderr),
					code,
					signal: killed
				};
				sp.setFields({
					code,
					signal: killed
				});
				resolve(result);
			});
			proc.on("error", (error) => reject(error));
		}).finally(() => {
			clearTimeout(timer);
			sp.end();
		});
	};
	/** Run a command, throwing a {@link ShellError} unless it exits zero. */
	static sh = make_macro((cmd, args, options = {}) => Shell.run(cmd, args, options).then((r) => {
		if (r.code !== 0) throw new ShellError(r);
		return r;
	}));
	/** Run a command and return its trimmed stdout, throwing unless it exits zero. */
	static sho = (cmd, args, options = {}) => Shell.sh(cmd, args, options).then((r) => r.stdout);
	/**
	* Run a command on the parent's streams, so its output appears as it is produced and it
	* can prompt for input. Throws a {@link ShellError} unless it exits zero; the result
	* carries the status but no output, since nothing was captured.
	*/
	static io = make_macro((cmd, args, options = {}) => Shell.sh(cmd, args, {
		...options,
		stdio: "inherit"
	}));
	/** Run a command and report only whether it succeeded. Never throws for a failed command. */
	static ok = make_macro((cmd, args, options = {}) => Shell.run(cmd, args, options).then((r) => r.code === 0, () => false));
	/**
	* {@link run} on the parent's streams: the output goes to the terminal as it is produced and
	* the status comes back whatever it is. What {@link io} is to {@link sh}, this is to `run` —
	* for a long or interactive command whose failure is an answer rather than an error.
	*/
	static io_run = make_macro((cmd, args, options = {}) => Shell.run(cmd, args, {
		...options,
		stdio: "inherit"
	}));
	/** {@link ok} on the parent's streams. Never throws for a failed command. */
	static io_ok = make_macro((cmd, args, options = {}) => Shell.ok(cmd, args, {
		...options,
		stdio: "inherit"
	}));
};
//#endregion
export { Shell, ShellError };

//# sourceMappingURL=shell.js.map