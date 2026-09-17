import { format, kebab } from "../core/text.js";
import { CliError } from "./core/error.js";
import { Arg } from "./arg.js";
import { Cmd } from "./cmd.js";
import { Completion } from "./completion/index.js";
import macro_default from "./macro.js";
import { Cli } from "./cli.js";
export { Arg, Cli, CliError, Cmd, Completion, macro_default as c, format, kebab };
