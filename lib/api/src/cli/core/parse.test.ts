import { describe, expect, test } from 'vitest'

import { Arg } from '../arg.ts'
import { Cmd } from '../cmd.ts'
import { CliError } from './error.ts'
import { Parse } from './parse.ts'

/**
 * Characterisation of `route` and `parse` as they behave today. Written before the
 * tokeniser was extracted, so a behaviour change shows up here rather than in a shell.
 */

const tree = (): Cmd.Node =>
  Cmd.build('app')
    .option(Arg.string('config', { alias: 'c' }), Arg.boolean('trace'))
    .arg(Arg.string('root', { positional: true }))
    .with(
      Cmd.build('build')
        .arg(
          Arg.boolean('force', { alias: 'f' }),
          Arg.boolean('all', { alias: 'a' }),
          Arg.number('count', { alias: 'n' }),
          Arg.string('target', { positional: true }),
        )
        .with(Cmd.build('once')),
      Cmd.build('deployApi').option(Arg.string('deep')),
      Cmd.build('run').arg(
        Arg.array(Arg.string(), 'args', { positional: true }),
        Arg.string('tail', { positional: true }),
      ),
    )

const at = (path: string[]): Cmd.Node => {
  let cmd = tree()
  for (const name of path) cmd = cmd.find(name)!
  return cmd
}

const code = (fn: () => unknown): string => {
  try {
    fn()
  } catch (error) {
    return error instanceof CliError ? error.code : `not-a-clierror:${String(error)}`
  }
  return 'no-throw'
}

describe('route', () => {
  const route = (argv: string[]) => {
    const result = Parse.route(tree(), argv)
    return { cmd: result.cmd.name, argv: result.argv }
  }

  test('descends by exact name and by kebab of a camelCase name', () => {
    expect(route(['build']).cmd).toBe('build')
    expect(route(['deployApi']).cmd).toBe('deployApi')
    expect(route(['deploy-api']).cmd).toBe('deployApi')
    expect(route(['build', 'once']).cmd).toBe('once')
  })

  test('stops at an unknown operand, leaving it for the node that would own it', () => {
    expect(route(['nosuch', 'build'])).toEqual({ cmd: 'app', argv: ['nosuch', 'build'] })
  })

  test('stops at `--`, leaving it in argv', () => {
    expect(route(['--', 'build'])).toEqual({ cmd: 'app', argv: ['--', 'build'] })
  })

  test('lifts a boolean global ahead of a subcommand, taking one token', () => {
    expect(route(['--trace', 'build'])).toEqual({ cmd: 'build', argv: ['--trace'] })
  })

  test('lifts a value-taking global ahead of a subcommand, taking two tokens', () => {
    expect(route(['--config', 'x', 'build'])).toEqual({ cmd: 'build', argv: ['--config', 'x'] })
    expect(route(['-c', 'x', 'build'])).toEqual({ cmd: 'build', argv: ['-c', 'x'] })
  })

  test('an inline value keeps a value-taking global to one token', () => {
    expect(route(['--config=x', 'build'])).toEqual({ cmd: 'build', argv: ['--config=x'] })
    expect(route(['-c=x', 'build'])).toEqual({ cmd: 'build', argv: ['-c=x'] })
  })

  test('a glued short value keeps the walk going, and stays one token', () => {
    expect(route(['-cx', 'build'])).toEqual({ cmd: 'build', argv: ['-cx'] })
    expect(route(['-c/tmp/a.ts', 'build', 'once'])).toEqual({ cmd: 'once', argv: ['-c/tmp/a.ts'] })
  })

  test('the negated form of a boolean global is lifted', () => {
    expect(route(['--no-trace', 'build'])).toEqual({ cmd: 'build', argv: ['--no-trace'] })
  })

  // `--no-config` is not a boolean, so the prefix means nothing and the walk stops.
  test('the negated form is only read for a boolean', () => {
    expect(route(['--no-config', 'build'])).toEqual({ cmd: 'app', argv: ['--no-config', 'build'] })
  })

  // The tree above declares its shorts as args rather than options, and only an option is
  // liftable — bundles need a root whose globals carry the short forms.
  describe('short bundles', () => {
    const bundled = (argv: string[]) => {
      const root = Cmd.build('app')
        .option(
          Arg.boolean('verbose', { alias: 'v' }),
          Arg.boolean('quiet', { alias: 'q' }),
          Arg.string('config', { alias: 'c' }),
        )
        .with(Cmd.build('build'))

      const result = Parse.route(root, argv)
      return { cmd: result.cmd.name, argv: result.argv }
    }

    test('a bundle of booleans is lifted whole', () => {
      expect(bundled(['-vq', 'build'])).toEqual({ cmd: 'build', argv: ['-vq'] })
    })

    test('a bundle ending in a value-taking short takes the next token with it', () => {
      expect(bundled(['-vc', 'x', 'build'])).toEqual({ cmd: 'build', argv: ['-vc', 'x'] })
    })

    test('a bundle whose value is glued on, or inline, stays one token', () => {
      expect(bundled(['-vcx', 'build'])).toEqual({ cmd: 'build', argv: ['-vcx'] })
      expect(bundled(['-vc=x', 'build'])).toEqual({ cmd: 'build', argv: ['-vc=x'] })
    })

    test('an unknown character anywhere in a bundle stops the walk', () => {
      expect(bundled(['-vz', 'build'])).toEqual({ cmd: 'app', argv: ['-vz', 'build'] })
    })
  })

  test('accepts an option declared only on a descendant', () => {
    expect(route(['--deep', 'x', 'deployApi'])).toEqual({ cmd: 'deployApi', argv: ['--deep', 'x'] })
  })

  test('an unknown flag stops the walk', () => {
    expect(route(['--bogus', 'build'])).toEqual({ cmd: 'app', argv: ['--bogus', 'build'] })
  })

  test('lifted globals lead the remaining argv, in order', () => {
    expect(route(['--trace', 'build', '--force', 'x'])).toEqual({ cmd: 'build', argv: ['--trace', '--force', 'x'] })
  })

  // `-5` and `-` reach the dash branch, miss `global`, and break — same result either way.
  test('a numeric-looking flag and a bare dash stop the walk', () => {
    expect(route(['-5', 'build'])).toEqual({ cmd: 'app', argv: ['-5', 'build'] })
    expect(route(['-', 'build'])).toEqual({ cmd: 'app', argv: ['-', 'build'] })
  })
})

describe('parse', () => {
  const build = (argv: string[]) => Parse.parse(at(['build']), argv)
  const run = (argv: string[]) => Parse.parse(at(['run']), argv)

  test('a long flag takes the next token, or an inline one', () => {
    expect(build(['--count', '3']).input).toMatchObject({ count: 3 })
    expect(build(['--count=3']).input).toMatchObject({ count: 3 })
  })

  test('an empty inline value is still a value', () => {
    expect(Parse.parse(at([]), ['--config=']).context).toMatchObject({ config: '' })
  })

  test('a bare boolean is true, `--no-` is false, and an explicit value wins', () => {
    expect(build(['--force']).input).toMatchObject({ force: true })
    expect(build(['--no-force']).input).toMatchObject({ force: false })
    expect(build(['--force=false']).input).toMatchObject({ force: false })
  })

  test('`--no-` only applies to booleans', () => {
    expect(code(() => build(['--no-count']))).toBe('unknown-option')
  })

  test('a declared arg wins over the `--no-` fallback', () => {
    const cmd = Cmd.build('x').arg(Arg.string('no-force'), Arg.boolean('force'))
    expect(Parse.parse(cmd, ['--no-force', 'v']).input).toMatchObject({ 'no-force': 'v' })
  })

  test('short flags cluster, and the first value-taking one ends the cluster', () => {
    expect(build(['-fa']).input).toMatchObject({ force: true, all: true })
    expect(build(['-fn', '3']).input).toMatchObject({ force: true, count: 3 })
    expect(build(['-n5']).input).toMatchObject({ count: 5 })
    expect(build(['-n=5']).input).toMatchObject({ count: 5 })
    expect(build(['-n', '5']).input).toMatchObject({ count: 5 })
  })

  test('a numeric-looking token is a positional, not a short cluster', () => {
    expect(build(['-5']).input).toMatchObject({ target: '-5' })
    expect(build(['-.5']).input).toMatchObject({ target: '-.5' })
  })

  test('a bare dash is a positional', () => {
    expect(build(['-']).input).toMatchObject({ target: '-' })
  })

  test('`--` terminates, so a following flag is positional', () => {
    expect(build(['--', '--force']).input).toMatchObject({ target: '--force' })
  })

  test('help and version are synthesised unless shadowed', () => {
    expect(build(['--help'])).toMatchObject({ help: true })
    expect(build(['-h'])).toMatchObject({ help: true })
    expect(build(['--version'])).toMatchObject({ version: true })

    const shadowed = Cmd.build('x').arg(Arg.string('help'), Arg.string('h'), Arg.string('version'))
    expect(Parse.parse(shadowed, ['--help', 'v'])).toMatchObject({ help: false })
    expect(Parse.parse(shadowed, ['-h', 'v'])).toMatchObject({ help: false })
    expect(Parse.parse(shadowed, ['--version', 'v'])).toMatchObject({ version: false })
  })

  test('a value-taking flag at the end of argv is an error', () => {
    expect(code(() => build(['--count']))).toBe('missing-value')
    expect(code(() => build(['-n']))).toBe('missing-value')
  })

  test('an unknown option reports, and suggests a near miss', () => {
    expect(code(() => build(['--bogus']))).toBe('unknown-option')
    expect(code(() => build(['-z']))).toBe('unknown-option')
    expect(() => build(['--forc'])).toThrow(/Did you mean '--force'/)
  })

  test('positionals fill in order, and a variadic soaks up the rest', () => {
    expect(run(['a', 'b', 'c']).input).toEqual({ args: ['a', 'b', 'c'] })
  })

  test('a slot after a variadic is never filled', () => {
    expect(run(['a']).input).not.toHaveProperty('tail')
  })

  test('an extra positional is an unknown command when the node has subcommands', () => {
    expect(code(() => Parse.parse(at([]), ['a', 'b']))).toBe('unknown-command')
    expect(code(() => Parse.parse(at(['build', 'once']), ['a']))).toBe('unexpected-argument')
  })

  test('a repeated flag appends for an array and last-wins otherwise', () => {
    expect(run(['--args', 'a', '--args', 'b']).input).toMatchObject({ args: ['a', 'b'] })
    expect(build(['--count', '1', '--count', '2']).input).toMatchObject({ count: 2 })
  })

  test('a missing required arg reports every one, by token', () => {
    const cmd = Cmd.build('x').arg(Arg.string('one', { required: true }), Arg.string('two', { required: true }))
    expect(code(() => Parse.parse(cmd, []))).toBe('missing-argument')
    expect(() => Parse.parse(cmd, [])).toThrow(/--one, --two/)
  })

  test('an undecodable value reports, attributed to the command', () => {
    expect(code(() => build(['--count', 'abc']))).toBe('invalid-value')
  })

  test('own args land in input, inherited options in context, with defaults applied', () => {
    const cmd = Cmd.build('x')
      .option(Arg.string('shared'))
      .arg(Arg.string('own', { default: 'd' }))
    const result = Parse.parse(cmd, ['--shared', 's'])

    expect(result.input).toEqual({ own: 'd' })
    expect(result.context).toEqual({ shared: 's' })
  })

  test('help short-circuits before positionals are checked', () => {
    expect(Parse.parse(at([]), ['a', 'b', '--help'])).toMatchObject({ help: true, input: {}, context: {} })
  })
})
