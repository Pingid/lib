import { Render } from './render.ts'
import type { Cmd } from '../cmd.ts'

export declare namespace Help {
  interface Options {
    target?: Render.Target | undefined
    /** Include `--version` in the options list. Set by `Cli` for the root command. */
    version?: boolean | undefined
  }
}

export const usage = (cmd: Cmd.Node): string => {
  if (cmd.usage) return cmd.usage

  const parts = [cmd.path().join(' ')]

  if (cmd.flags().length > 0 || cmd.globals().length > 0) parts.push('[options]')
  if (cmd.commands.length > 0) parts.push(cmd.handler || cmd.args.length > 0 ? '[command]' : '<command>')
  for (const arg of cmd.positional()) parts.push(arg.placeholder())

  return parts.join(' ')
}

export const help = (cmd: Cmd.Node, options: Help.Options = {}): void => {
  const render = Render.from(options.target)

  if (cmd.description) render.line(cmd.description).blank()

  render.line('Usage:')
  render.indent((r) => r.line(usage(cmd)))

  render.section(
    'Commands:',
    cmd.commands.map((child) => [child.name, child.description] as const),
  )

  render.section(
    'Arguments:',
    cmd.positional().map((arg) => [arg.placeholder(), arg.summary()] as const),
  )

  render.section('Options:', [
    ...cmd.flags().map((arg) => [arg.label(), arg.summary()] as const),
    ['-h, --help', 'Show this help message'] as const,
    ...(options.version ? [['--version', 'Show version number'] as const] : []),
  ])

  render.section(
    'Global options:',
    cmd.globals().map((arg) => [arg.label(), arg.summary()] as const),
  )

  render.blank()
}

export const Help = { usage, help }
