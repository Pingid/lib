import type { Schema } from '../../core/index.ts'
import type { Cmd } from '../cmd.ts'

export declare namespace CliError {
  type Code =
    | 'unknown-option'
    | 'unknown-command'
    | 'missing-command'
    | 'missing-value'
    | 'missing-argument'
    | 'unexpected-argument'
    | 'invalid-value'

  interface Options {
    code?: Code
    cmd?: Cmd.Node
    exit?: number
  }
}

/**
 * A failure caused by the invocation rather than the handler. These are reported
 * as `error: <message>` plus a usage hint; anything else propagates untouched.
 */
export class CliError extends Error {
  readonly code: CliError.Code
  readonly exit: number

  /** Attached by whoever has it — an `Arg` decoding a token does not know its command. */
  cmd: Cmd.Node | undefined

  constructor(message: string, options: CliError.Options = {}) {
    super(message)
    this.name = 'CliError'
    this.code = options.code ?? 'invalid-value'
    this.cmd = options.cmd
    this.exit = options.exit ?? 1
  }

  /** Fills in the command if it is not already known. Returns itself, to rethrow. */
  at(cmd: Cmd.Node): this {
    this.cmd ??= cmd
    return this
  }

  /** One line per path, outermost only — nested failures repeat the same root cause. */
  static fromIssues(issues: Schema.Issue[], cmd?: Cmd.Node): CliError {
    const seen = new Set<string>()
    const lines: string[] = []

    for (const issue of issues) {
      if (seen.has(issue.path)) continue
      seen.add(issue.path)
      lines.push(issue.path ? `${issue.path}: ${issue.message}` : issue.message)
    }

    return new CliError(lines.join('\n'), { code: 'invalid-value', ...(cmd ? { cmd } : {}) })
  }
}
