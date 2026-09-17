const require_error = require("../../core/error.cjs");
require("../../core/index.cjs");
//#region lib/api/src/cli/core/errors.ts
/**
* A user-facing failure: a bad flag, a missing argument, an unknown command.
*
* The exit code defaults to `2`, the conventional "usage error" status, which
* keeps it distinguishable from a command that ran and failed (`1`). There is no
* path on it: the runner knows the command path it resolved and reports against
* that, rather than reaching into a thrown value to staple a field onto it.
*
* It extends core's `InputError`, so a handler that throws the portable one —
* written for no target in particular — is treated here exactly the same way,
* and gets the same exit code as a bad flag rather than being mistaken for the
* command itself failing.
*/
var CliError = class extends require_error.InputError {
	exitCode;
	constructor(message, opts = {}) {
		super(message);
		this.name = "CliError";
		this.exitCode = opts.exitCode ?? 2;
	}
};
//#endregion
exports.CliError = CliError;

//# sourceMappingURL=errors.cjs.map