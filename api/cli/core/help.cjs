const require_render = require("./render.cjs");
//#region lib/api/src/cli/core/help.ts
var usage = (cmd) => {
	if (cmd.usage) return cmd.usage;
	const parts = [cmd.path().join(" ")];
	if (cmd.flags().length > 0 || cmd.globals().length > 0) parts.push("[options]");
	if (cmd.commands.length > 0) parts.push(cmd.handler || cmd.args.length > 0 ? "[command]" : "<command>");
	for (const arg of cmd.positional()) parts.push(arg.placeholder());
	return parts.join(" ");
};
var help = (cmd, options = {}) => {
	const render = require_render.Render.from(options.target);
	if (cmd.description) render.line(cmd.description).blank();
	render.line("Usage:");
	render.indent((r) => r.line(usage(cmd)));
	render.section("Commands:", cmd.commands.map((child) => [child.name, child.description]));
	render.section("Arguments:", cmd.positional().map((arg) => [arg.placeholder(), arg.summary()]));
	render.section("Options:", [
		...cmd.flags().map((arg) => [arg.label(), arg.summary()]),
		["-h, --help", "Show this help message"],
		...options.version ? [["--version", "Show version number"]] : []
	]);
	render.section("Global options:", cmd.globals().map((arg) => [arg.label(), arg.summary()]));
	render.blank();
};
var Help = {
	usage,
	help
};
//#endregion
exports.Help = Help;
exports.help = help;
exports.usage = usage;

//# sourceMappingURL=help.cjs.map