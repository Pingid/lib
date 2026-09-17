#!/usr/bin/env node
const require_stack = require("../stack.cjs");
const require_project = require("../project.cjs");
const require_validate = require("./validate.cjs");
let node_path = require("node:path");
let node_url = require("node:url");
let node_fs = require("node:fs");
let node_child_process = require("node:child_process");
let node_os = require("node:os");
//#region lib/ship/cli/cli.ts
var CONFIG_CANDIDATES = [
	"stack.config.ts",
	"stack.config.mts",
	"stack.config.js",
	"stack.config.mjs"
];
/** Docker commands that tear down, and so run in reverse dependency order. */
var REVERSED = /* @__PURE__ */ new Set([
	"down",
	"stop",
	"kill",
	"rm"
]);
/** Docker commands that own the user's terminal; these get a temp file so stdin stays theirs. */
var INTERACTIVE = /* @__PURE__ */ new Set([
	"exec",
	"run",
	"attach"
]);
/** Handled here rather than passed to docker. `__project` is internal, used by --watch. */
var LOCAL = /* @__PURE__ */ new Set([
	"ls",
	"build",
	"check",
	"help",
	"--help",
	"-h",
	"__project"
]);
var parse = (argv) => {
	const options = {
		command: "help",
		stacks: [],
		validate: true,
		watch: false,
		dryRun: false,
		dockerArgs: []
	};
	const rest = [];
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--") {
			options.dockerArgs.push(...argv.slice(i + 1));
			break;
		}
		const next = () => {
			const value = argv[++i];
			if (value === void 0) throw new Error(`${arg} expects a value`);
			return value;
		};
		if (arg === "-c" || arg === "--config") options.config = next();
		else if (arg === "-s" || arg === "--stack") options.stacks.push(next());
		else if (arg === "--project-dir" || arg === "--project-directory") options.projectDir = next();
		else if (arg === "--out" || arg === "-o") options.out = next();
		else if (arg === "--no-validate") options.validate = false;
		else if (arg === "--watch") options.watch = true;
		else if (arg === "--dry-run") options.dryRun = true;
		else rest.push(arg);
	}
	options.command = rest.shift() ?? options.dockerArgs.shift() ?? "help";
	if (LOCAL.has(options.command)) options.stacks.push(...rest);
	else options.dockerArgs.unshift(...rest);
	return options;
};
var findConfig = (explicit) => {
	if (explicit) {
		const path = (0, node_path.resolve)(explicit);
		if (!(0, node_fs.existsSync)(path)) throw new Error(`config not found: ${path}`);
		return path;
	}
	for (const candidate of CONFIG_CANDIDATES) {
		const path = (0, node_path.resolve)(candidate);
		if ((0, node_fs.existsSync)(path)) return path;
	}
	throw new Error(`no config found — looked for ${CONFIG_CANDIDATES.join(", ")} in ${process.cwd()}`);
};
var stripsTypes = () => {
	const [major = 0, minor = 0] = process.versions.node.split(".").map(Number);
	return major > 22 || major === 22 && minor >= 18;
};
var load = async (configPath) => {
	if (configPath.endsWith(".ts") && !stripsTypes()) throw new Error(`Node ${process.versions.node} cannot load a TypeScript config. Upgrade to 22.18+ or run with: node --import tsx ${process.argv[1]}`);
	const module = await import((0, node_url.pathToFileURL)(configPath).href);
	const exported = module["default"] ?? module["stacks"] ?? module["config"];
	const value = await (typeof exported === "function" ? exported() : exported);
	if (value == null) throw new Error(`${configPath} has no default export`);
	if (value instanceof require_stack.Stack) return require_project.Project.build(value);
	if (Array.isArray(value)) return require_project.Project.build(...value);
	if (typeof value === "object" && "specs" in value && "order" in value) return value;
	const spec = value;
	const name = spec.name ?? (0, node_path.basename)((0, node_path.dirname)(configPath));
	return {
		order: [name],
		edges: [],
		specs: { [name]: spec },
		projects: { [name]: name }
	};
};
/**
* Reload in a child process.
*
* A cache-busting query string only busts the config module itself — its static imports stay
* cached, so an edit to an imported file would reload into an identical spec. A fresh process
* is the only honest way to get a fresh module graph.
*/
var reload = (configPath) => new Promise((done, fail) => {
	const self = (0, node_url.fileURLToPath)({}.url);
	const child = (0, node_child_process.spawn)(process.execPath, [
		self,
		"__project",
		"-c",
		configPath
	], { stdio: [
		"ignore",
		"pipe",
		"pipe"
	] });
	let out = "";
	let err = "";
	child.stdout.setEncoding("utf8").on("data", (chunk) => out += chunk);
	child.stderr.setEncoding("utf8").on("data", (chunk) => err += chunk);
	child.on("error", fail);
	child.on("close", (code) => {
		if (code !== 0) return fail(new Error(err.trim() || `config reload exited ${code}`));
		try {
			done(JSON.parse(out));
		} catch {
			fail(/* @__PURE__ */ new Error(`config reload produced invalid output: ${out.slice(0, 200)}`));
		}
	});
});
var select = (built, names) => {
	if (names.length === 0) return built.order;
	for (const name of names) if (!(name in built.specs)) throw new Error(`unknown stack "${name}" — have: ${Object.keys(built.specs).join(", ")}`);
	return built.order.filter((n) => names.includes(n));
};
/** Report reference problems; returns the number of errors. */
var check = (built, names) => {
	let errors = 0;
	for (const name of names) {
		const problems = require_validate.validate(built.specs[name]);
		if (problems.length > 0) process.stderr.write(`${require_validate.formatProblems(problems, `[${name}]`)}\n`);
		errors += problems.filter((p) => p.level === "error").length;
	}
	return errors;
};
var docker = (args, spec, options) => {
	const interactive = INTERACTIVE.has(options.command);
	if (options.dryRun) {
		const shown = interactive ? args.map((a) => a === "-" ? "<compose.json>" : a) : args;
		process.stdout.write(`docker ${shown.join(" ")}\n`);
		return Promise.resolve(0);
	}
	let scratch;
	let full = args;
	if (interactive) {
		scratch = (0, node_fs.mkdtempSync)((0, node_path.join)((0, node_os.tmpdir)(), "stack-"));
		const file = (0, node_path.join)(scratch, "compose.json");
		(0, node_fs.writeFileSync)(file, JSON.stringify(spec));
		full = args.map((a) => a === "-" ? file : a);
	}
	return new Promise((done, fail) => {
		const child = (0, node_child_process.spawn)("docker", full, { stdio: interactive ? "inherit" : [
			"pipe",
			"inherit",
			"inherit"
		] });
		child.on("error", fail);
		child.on("close", (code, signal) => done(code ?? (signal ? 1 : 0)));
		if (!interactive && child.stdin) {
			child.stdin.on("error", () => {});
			child.stdin.end(JSON.stringify(spec));
		}
	}).finally(() => {
		if (scratch) (0, node_fs.rmSync)(scratch, {
			recursive: true,
			force: true
		});
	});
};
var run = async (built, options, projectDir) => {
	const names = select(built, options.stacks);
	const tearingDown = REVERSED.has(options.command);
	const ordered = tearingDown ? [...names].reverse() : names;
	if (options.validate && !tearingDown) {
		const errors = check(built, names);
		if (errors > 0) throw new Error(`${errors} reference error(s) — pass --no-validate to run anyway`);
	}
	let code = 0;
	for (const name of ordered) {
		const result = await docker([
			"compose",
			"--project-name",
			built.projects[name],
			"--project-directory",
			projectDir,
			"-f",
			"-",
			options.command,
			...options.dockerArgs
		], built.specs[name], options);
		if (result !== 0) {
			code = result;
			if (!tearingDown) break;
		}
	}
	return code;
};
var usage = `Usage: stack <command> [stack...] [options] [-- docker args]

Commands
  ls                    stacks, their resources and dependency order
  build [stack...]      print the generated compose file(s) as JSON
  check [stack...]      validate references, then run \`docker compose config -q\`
  <docker command>      anything else is passed to \`docker compose\` with the
                        generated file on stdin: up -d, down, logs -f, ps, exec api sh

Options
  -c, --config <path>   config file (default: ${CONFIG_CANDIDATES.join(", ")})
  -s, --stack <name>    limit to one stack (repeatable)
      --project-dir <p> --project-directory for docker (default: the config's directory)
  -o, --out <file>      write build output to a file
      --no-validate     skip the reference check
      --watch           with \`up\`: re-generate and re-converge on change
      --dry-run         print the docker commands instead of running them
`;
var main = async () => {
	const options = parse(process.argv.slice(2));
	if (options.command === "help" || options.command === "--help" || options.command === "-h") {
		process.stdout.write(usage);
		return 0;
	}
	const configPath = findConfig(options.config);
	const projectDir = (0, node_path.resolve)(options.projectDir ?? (0, node_path.dirname)(configPath));
	let built = await load(configPath);
	if (options.command === "__project") {
		process.stdout.write(JSON.stringify(built));
		return 0;
	}
	if (options.command === "ls") {
		for (const name of built.order) {
			const spec = built.specs[name];
			const counts = [
				"services",
				"networks",
				"volumes",
				"secrets",
				"configs"
			].map((group) => [group, Object.keys(spec[group] ?? {}).length]).filter(([, n]) => n > 0).map(([group, n]) => `${n} ${n === 1 ? group.slice(0, -1) : group}`).join(", ");
			const deps = built.edges.filter(([, to]) => to === name).map(([from]) => from);
			process.stdout.write(`${name}  (project: ${built.projects[name]})  ${counts}${deps.length ? `  after: ${deps.join(", ")}` : ""}\n`);
		}
		return 0;
	}
	if (options.command === "build") {
		const names = select(built, options.stacks);
		const payload = names.length === 1 ? built.specs[names[0]] : Object.fromEntries(names.map((n) => [n, built.specs[n]]));
		const json = `${JSON.stringify(payload, null, 2)}\n`;
		if (options.out) (0, node_fs.writeFileSync)((0, node_path.resolve)(options.out), json);
		else process.stdout.write(json);
		return 0;
	}
	if (options.command === "check") {
		const names = select(built, options.stacks);
		let code = check(built, names) > 0 ? 1 : 0;
		for (const name of names) {
			const result = await docker([
				"compose",
				"--project-name",
				built.projects[name],
				"--project-directory",
				projectDir,
				"-f",
				"-",
				"config",
				"--quiet"
			], built.specs[name], options);
			if (result !== 0) code = result;
		}
		return code;
	}
	if (!options.watch) return run(built, options, projectDir);
	let running = false;
	let queued = false;
	const converge = async () => {
		if (running) {
			queued = true;
			return;
		}
		running = true;
		try {
			built = await reload(configPath);
			await run(built, options, projectDir);
		} catch (error) {
			process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
		} finally {
			running = false;
			if (queued) {
				queued = false;
				converge();
			}
		}
	};
	let timer;
	(0, node_fs.watch)((0, node_path.dirname)(configPath), { recursive: true }, (_event, file) => {
		if (file && /(^|[\\/])(node_modules|\.git)([\\/]|$)/.test(String(file))) return;
		clearTimeout(timer);
		timer = setTimeout(() => void converge(), 150);
	});
	process.stderr.write(`watching ${(0, node_path.dirname)(configPath)} — ctrl-c to stop\n`);
	await converge();
	return new Promise(() => {});
};
main().then((code) => {
	process.exitCode = code;
}, (error) => {
	process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
	process.exitCode = 1;
});
//#endregion

//# sourceMappingURL=cli.cjs.map