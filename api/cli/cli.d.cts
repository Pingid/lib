import { Compute, Struct } from './core/util.cjs';
import { Render } from './core/render.cjs';
import { Cmd } from './cmd.cjs';
export declare namespace Cli {
    type Config = {
        /** Renames the root, so help and usage read as the installed binary. */
        binary?: string;
        version?: string;
        out?: Render.Target;
        err?: Render.Target;
        print?: (value: unknown, render: Render) => void;
    };
}
export declare class Cli<C extends Struct = {}> {
    root: Cmd.Node;
    config: Cli.Config;
    private _out;
    private _err;
    /** Wrap an existing command or api node as the root. */
    static for<N extends Cmd.Any>(root: N, config?: Cli.Config): Cli<Compute<Cmd.Context<N>>>;
    /** Start from an empty root and mount commands onto it. */
    static build(config?: Cli.Config): Cli<{}>;
    static run<N extends Cmd.Any, C extends Struct = {}>(root: N, argv?: string[], config?: Cli.Config, context?: C): Promise<number>;
    constructor(root: Cmd.Node, config?: Cli.Config);
    with<const N extends readonly Cmd.Any[]>(...children: N): Cli<Compute<C & Cmd.Context<N[number]>>>;
    get out(): Render;
    get err(): Render;
    /** Parse, validate, dispatch. Returns an exit code; never exits the process. */
    run(argv?: string[], context?: C): Promise<number>;
    /** `run` plus `process.exit`. The entry point for a binary. */
    main(argv?: string[], context?: C): Promise<never>;
    help(cmd?: Cmd.Node, target?: Render.Target): void;
    version(target?: Render.Target): void;
    print(value: unknown): void;
    /** Report a `CliError` on stderr. Anything else is a bug and rethrows. */
    fail(error: unknown): number;
}
