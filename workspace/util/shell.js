import { spawn } from "node:child_process";
//#region lib/workspace/src/util/shell.ts
var Shell = class Shell {
	static sho = (cmd, args, options = {}) => Shell.sh(cmd, args, options).then((r) => r.stdout);
	static sh = (cmd, args, options = {}) => {
		const proc = spawn(cmd, args, {
			stdio: "pipe",
			env: process.env,
			...options
		});
		const stdout = [];
		const stderr = [];
		proc.stdout.on("data", (data) => stdout.push(data));
		proc.stderr.on("data", (data) => stderr.push(data));
		const join = (buffers) => buffers.map((b) => b.toString("utf-8")).join("").trim();
		return new Promise((resolve, reject) => {
			proc.on("close", (code) => {
				if (code !== 0) reject(/* @__PURE__ */ new Error(`${cmd} ${args.join(" ")} failed: ${join(stderr)}`));
				else resolve({
					stdout: join(stdout),
					stderr: join(stderr),
					code
				});
			});
			proc.on("error", (error) => reject(error));
		});
	};
};
//#endregion
export { Shell };

//# sourceMappingURL=shell.js.map