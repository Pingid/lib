import { createContext, execute, resolvePath } from "./context.js";
//#region lib/ship/src/config/run.ts
var run = async (config) => {
	const ctx = createContext(config);
	const args = config.argv ?? process.argv.slice(2);
	const stackNames = Object.keys(config.stacks);
	if (args.length === 0) return console.log(help());
	let stackName = args.length > 0 && config.stacks[args[0]] ? (args.shift(), args[0]) : config.default;
	if (!stackName && stackNames.length === 1) stackName = stackNames[0];
	if (!stackName || !config.stacks[stackName]) throw new Error(`Stack ${stackName} not found`);
	const cmd = commands[args[0]];
	if (cmd) {
		args.shift();
		throw new Error(`Command ${cmd} not yet implemented`);
	}
	const file = await resolvePath(ctx, config.stacks[stackName]);
	return execute(ctx, {
		bin: ctx.config.bin ?? "docker",
		env: {
			...process.env,
			...ctx.config.env ?? {}
		},
		args: [
			...ctx.config.defaultArgs ?? ["compose"],
			"-f",
			file,
			...ctx.config.argv ?? process.argv.slice(2)
		]
	});
};
var commands = { diff: { run: (_ctx, _config) => {} } };
var help = () => {
	throw new Error("Help not yet implemented");
};
//#endregion
export { run };

//# sourceMappingURL=run.js.map