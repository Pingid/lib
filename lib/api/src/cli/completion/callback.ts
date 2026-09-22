import { Render } from '../core/render.ts'
import { resolve } from './resolve.ts'
import type { Resolve } from './resolve.ts'
import type { Cmd } from '../cmd.ts'

/** Leading dashes keep it clear of any declared subcommand, and out of help. */
export const MARKER = '__complete'

export declare namespace Callback {
  interface Options extends Resolve.Options {
    out?: Render.Target | undefined
  }
}

/**
 * The `__complete` protocol: one candidate per line as `value<TAB>description`, then a
 * `:directive` trailer that is always present.
 *
 * Always resolves 0. A non-zero exit is indistinguishable from a missing binary, and
 * would make every driver fall back for the wrong reason.
 *
 * @example callback(root, ['--', 'build', '--env', '']) // 'dev\nprod\n:none\n'
 */
export const callback = async (
  root: Cmd.Node,
  argv: readonly string[],
  options: Callback.Options = {},
): Promise<number> => {
  const render = Render.from(options.out)

  try {
    // The `--` is mandatory from the drivers: the words are arbitrary text full of flags.
    const rest = argv[0] === '--' ? argv.slice(1) : argv
    const result = await resolve(root, rest.length > 0 ? rest : [''], options)

    for (const item of result.items) {
      render.line(item.description ? `${item.value}\t${item.description}` : item.value)
    }

    render.line(`:${result.directive}`)
  } catch {
    render.line(':default')
  }

  return 0
}

export const Callback = { MARKER, callback }
