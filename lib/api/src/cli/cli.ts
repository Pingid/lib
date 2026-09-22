import type { Compute, Struct } from './core/util.ts'
import { CliError } from './core/error.ts'
import { Render } from './core/render.ts'
import { Parse } from './core/parse.ts'
import { Help } from './core/help.ts'
import { MARKER, callback } from './completion/callback.ts'
import { Cmd } from './cmd.ts'

export declare namespace Cli {
  type Config = {
    /** Renames the root, so help and usage read as the installed binary. */
    binary?: string
    version?: string
    out?: Render.Target
    err?: Render.Target
    print?: (value: unknown, render: Render) => void
  }
}

export class Cli<C extends Struct = {}> {
  root: Cmd.Node
  config: Cli.Config

  private _out: Render | undefined
  private _err: Render | undefined

  /** Wrap an existing command or api node as the root. */
  static for<N extends Cmd.Any>(root: N, config: Cli.Config = {}): Cli<Compute<Cmd.Context<N>>> {
    const cmd = Cmd.from(root)
    return new Cli(config.binary ? cmd.rename(config.binary) : cmd, config)
  }

  /** Start from an empty root and mount commands onto it. */
  static build(config: Cli.Config = {}): Cli<{}> {
    return new Cli(Cmd.build(config.binary ?? 'cli'), config)
  }
  static run<N extends Cmd.Any, C extends Struct = {}>(
    root: N,
    argv: string[] = process.argv.slice(2),
    config: Cli.Config = {},
    context: C = {} as C,
  ): Promise<number> {
    return new Cli(Cmd.from(root), config).run(argv, context)
  }

  constructor(root: Cmd.Node, config: Cli.Config = {}) {
    this.root = root
    this.config = config
  }

  with<const N extends readonly Cmd.Any[]>(...children: N): Cli<Compute<C & Cmd.Context<N[number]>>> {
    this.root.with(...children)
    return this as any
  }

  get out(): Render {
    return (this._out ??= Render.from(this.config.out ?? process.stdout))
  }

  get err(): Render {
    return (this._err ??= Render.from(this.config.err ?? process.stderr))
  }

  /** Parse, validate, dispatch. Returns an exit code; never exits the process. */
  async run(argv: string[] = process.argv.slice(2), context: C = {} as C): Promise<number> {
    // Outside the `try`: the callback never throws, and must not reach `fail`, which would
    // print to stderr and exit non-zero — indistinguishable from a missing binary.
    if (argv[0] === MARKER) {
      return callback(this.root, argv.slice(1), { out: this.out, version: this.config.version !== undefined })
    }

    try {
      const routed = Parse.route(this.root, argv)
      const result = Parse.parse(routed.cmd, routed.argv)

      if (result.version && this.config.version !== undefined) {
        this.version()
        return 0
      }

      if (result.help) {
        this.help(result.cmd)
        return 0
      }

      if (!result.cmd.handler) {
        this.help(result.cmd)
        return 1
      }

      const input = await result.cmd.validate(result.input)
      const output = await result.cmd.invoke(input, { ...context, ...result.context })

      if (output !== undefined) this.print(output)
      return 0
    } catch (error) {
      return this.fail(error)
    }
  }

  /** `run` plus `process.exit`. The entry point for a binary. */
  async main(argv?: string[], context: C = {} as C): Promise<never> {
    process.exit(await this.run(argv, context))
  }

  help(cmd: Cmd.Node = this.root, target?: Render.Target): void {
    const render = Render.from(target ?? this.out)
    const root = cmd === this.root

    if (root && this.config.version !== undefined) render.line(`${this.root.name} ${this.config.version}`).blank()

    Help.help(cmd, { target: render, version: root && this.config.version !== undefined })
  }

  version(target?: Render.Target): void {
    Render.from(target ?? this.out).line(this.config.version ?? '0.0.0')
  }

  print(value: unknown): void {
    if (this.config.print) return this.config.print(value, this.out)
    this.out.line(typeof value === 'string' ? value : JSON.stringify(value, null, 2))
  }

  /** Report a `CliError` on stderr. Anything else is a bug and rethrows. */
  fail(error: unknown): number {
    if (!(error instanceof CliError)) throw error

    this.err.line(`error: ${error.message}`)

    if (error.cmd) {
      this.err.blank().line(`Usage: ${Help.usage(error.cmd)}`)
      this.err.line(`Run '${[...error.cmd.path(), '--help'].join(' ')}' for more information.`)
    }

    return error.exit
  }
}
