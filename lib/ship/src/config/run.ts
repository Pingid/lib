import fs from 'node:fs'

import type { Config } from './index.ts'

import * as Context from './context.ts'

/** Run `ship [stack] <command> [args...]`, resolving to the exit code. */
export const run = async (config: Config): Promise<number> => {
  const args = [...(config.argv ?? process.argv.slice(2))]

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') return print(help(config))

  // Resolve target stack
  const stackNames = Object.keys(config.stacks)
  const named = Object.hasOwn(config.stacks, args[0]!) ? args.shift() : undefined
  const stackName = named ?? config.default ?? (stackNames.length === 1 ? stackNames[0] : undefined)

  if (!stackName || !Object.hasOwn(config.stacks, stackName)) {
    const expected = stackNames.length > 0 ? stackNames.join(', ') : 'none declared'
    throw new Error(stackName ? `unknown stack "${stackName}" — expected one of ${expected}` : `which stack? — ${expected}`)
  }

  if (args.length === 0) return print(help(config))

  const ctx = Context.createContext(config)
  const stack = config.stacks[stackName]!

  // Check for built-in command
  const cmd = Object.hasOwn(commands, args[0]!) ? commands[args[0] as keyof typeof commands] : undefined
  if (cmd) return cmd(ctx, stack)

  // Store compose.json in scratch space
  const file = await Context.resolvePath(ctx, stack)
  const fileArgs = config.fileArgs ?? defaultFileArgs

  // Execute docker compose command
  return Context.execute(ctx, {
    bin: config.bin ?? 'docker',
    env: { ...process.env, ...(config.env ?? {}) },
    args: [...(config.defaultArgs ?? ['compose']), ...fileArgs(file, typeof stack === 'string' ? undefined : ctx.cwd), ...args],
  })
}

/** A generated file lives in tmp; its relative paths were written against the config, not there. */
const defaultFileArgs = (file: string, cwd: string | undefined): string[] =>
  cwd ? ['--project-directory', cwd, '-f', file] : ['-f', file]

const commands = {
  /** The stack's compose file on stdout. */
  print: async (ctx: Context.Cx, stack: Config['stacks'][string]): Promise<number> => {
    const spec = await Context.resolveSpec(stack)
    if (typeof spec === 'string') return print(await fs.promises.readFile(await Context.resolvePath(ctx, spec), 'utf8'))
    return print(`${JSON.stringify(spec, null, 2)}\n`)
  },
}

const print = (text: string): number => (process.stdout.write(text), 0)

/** Usage, with the stacks this config declares. */
export const help = (config: Config): string => {
  const stacks = Object.keys(config.stacks).map((name) => `  ${name}${name === config.default ? ' (default)' : ''}`)

  return [
    'Usage: ship [-c file] [stack] <command> [args...]',
    '',
    'Stacks:',
    ...(stacks.length > 0 ? stacks : ['  (none)']),
    '',
    'Commands:',
    "  print                 Write the stack's compose file to stdout",
    '  <docker compose args> Run `docker compose` against the stack, e.g. `ship app up -d`',
    '',
    'Options:',
    '  -c, --config <file>   Config file (default: the nearest ship.config.ts or stack.config.ts)',
    '',
  ].join('\n')
}
