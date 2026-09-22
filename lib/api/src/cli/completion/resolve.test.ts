import { describe, expect, test } from 'vitest'

import { Arg } from '../arg.ts'
import { Cmd } from '../cmd.ts'
import { resolve, site } from './resolve.ts'

const tree = (): Cmd.Node =>
  Cmd.build('app')
    .option(Arg.string('config', { alias: 'c', description: 'Config path', complete: 'file' }), Arg.boolean('trace'))
    .with(
      Cmd.build('build')
        .describe('Build it')
        .arg(
          Arg.boolean('force', { alias: 'f' }),
          Arg.boolean('all', { alias: 'a' }),
          Arg.enum(['dev', 'prod'] as const, 'env', { alias: 'e' }),
          Arg.string('target', { positional: true }),
        )
        .with(Cmd.build('once')),
      Cmd.build('deployApi').option(Arg.string('deep')),
      Cmd.build('run').arg(Arg.array(Arg.string(), 'args', { positional: true })),
    )

/** A line with a trailing space means the cursor is on a fresh empty word. */
const words = (line: string): string[] => (line.endsWith(' ') ? [...line.slice(0, -1).split(' '), ''] : line.split(' '))
const where = (line: string) => site(tree(), words(line).slice(1))
const values = async (line: string, root = tree()) =>
  (await resolve(root, words(line).slice(1))).items.map((i) => i.value)
const directive = async (line: string, root = tree()) => (await resolve(root, words(line).slice(1))).directive

describe('site', () => {
  test('a fresh word at the root is a subcommand slot', () => {
    expect(where('app ')).toMatchObject({ kind: 'operand', commands: true, slot: 0 })
  })

  test('a partial word does not route, so `dep` never resolves to `deployApi`', () => {
    expect(where('app dep').cmd.name).toBe('app')
    expect(where('app deployApi ').cmd.name).toBe('deployApi')
    expect(where('app deploy-api ').cmd.name).toBe('deployApi')
  })

  test('a dash-led word is a flag position, and a bare dash counts', () => {
    expect(where('app -').kind).toBe('flag')
    expect(where('app --').kind).toBe('none')
    expect(where('app --co').kind).toBe('flag')
  })

  test('the word after a value-taking flag is its value', () => {
    expect(where('app build --env ')).toMatchObject({ kind: 'value', prefix: '' })
    expect(where('app build --env ').arg?.name).toBe('env')
  })

  test('a boolean consumes nothing, so the next word is still positional', () => {
    expect(where('app build --force ')).toMatchObject({ kind: 'operand', slot: 0 })
    expect(where('app build -fa ')).toMatchObject({ kind: 'operand', slot: 0 })
  })

  test('`--flag=` is a value position, with the whole prefix carried', () => {
    expect(where('app build --env=d')).toMatchObject({ kind: 'value', word: 'd', prefix: '--env=' })
  })

  test('`--flag=` on a boolean or an unknown offers nothing', () => {
    expect(where('app build --force=t').kind).toBe('none')
    expect(where('app build --bogus=t').kind).toBe('none')
  })

  test('a short cluster stops at its first value-taking member', () => {
    expect(where('app build -fe')).toMatchObject({ kind: 'value', word: '', prefix: '-fe' })
    expect(where('app build -fed')).toMatchObject({ kind: 'value', word: 'd', prefix: '-fe' })
    expect(where('app build -e=d')).toMatchObject({ kind: 'value', word: 'd', prefix: '-e=' })
  })

  test('an all-boolean cluster offers no continuation', () => {
    expect(where('app build -fa').kind).toBe('none')
  })

  test('a settled cluster still places the following value', () => {
    expect(where('app build -fe ')).toMatchObject({ kind: 'value' })
    expect(where('app build -fe ').arg?.name).toBe('env')
  })

  test('after `--` there are no subcommands', () => {
    expect(where('app -- ')).toMatchObject({ kind: 'operand', commands: false })
    expect(where('app -- --force')).toMatchObject({ kind: 'operand', commands: false })
  })

  test('a numeric-looking word is positional, matching parse', () => {
    expect(where('app build -5').kind).toBe('operand')
    expect(where('app build -.5').kind).toBe('operand')
  })

  test('a global is accepted ahead of a subcommand, including one from a descendant', () => {
    expect(where('app --config x ')).toMatchObject({ commands: true })
    expect(where('app --config x build ').cmd.name).toBe('build')
    expect(where('app --deep x deployApi ').cmd.name).toBe('deployApi')
    expect(where('app --trace build ').cmd.name).toBe('build')
  })

  test('a glued short global does not route, matching route', () => {
    expect(where('app -cx build ').cmd.name).toBe('app')
    expect(where('app -c x build ').cmd.name).toBe('build')
    expect(where('app -c=x build ').cmd.name).toBe('build')
  })

  test('once a positional is taken, no subcommand can follow', () => {
    expect(where('app nosuch ')).toMatchObject({ commands: false, slot: 1 })
    expect(where('app build target ')).toMatchObject({ commands: false, slot: 1 })
  })

  test('a variadic slot never advances past itself', () => {
    expect(where('app run a b c ')).toMatchObject({ kind: 'operand', slot: 0 })
  })
})

describe('resolve', () => {
  test('offers subcommands at the root, and flags after a dash', async () => {
    expect(await values('app ')).toEqual(['build', 'deploy-api', 'run'])
    expect(await values('app -')).toContain('--config')
    expect(await values('app -')).toContain('--help')
  })

  test('offers declared choices for a flag value', async () => {
    expect(await values('app build --env ')).toEqual(['dev', 'prod'])
  })

  test('prefixes every value when the word was glued', async () => {
    expect(await values('app build --env=d')).toEqual(['--env=dev', '--env=prod'])
    expect(await values('app build -ed')).toEqual(['-edev', '-eprod'])
  })

  test(`a 'file' source travels as a directive, not as items`, async () => {
    expect(await directive('app --config ')).toBe('file')
    expect(await values('app --config ')).toEqual([])
  })

  test('a prefixed path source hands the word back to the shell', async () => {
    expect(await directive('app --config=/et')).toBe('default')
    expect(await values('app --config=/et')).toEqual([])
  })

  test('negations are offered only once the user commits to the shape', async () => {
    expect(await values('app build --')).not.toContain('--no-force')
    expect(await values('app build --no')).toContain('--no-force')
    expect(await values('app build --no')).not.toContain('--no-help')
  })

  test('--version is offered only at the root, and only when the CLI has one', async () => {
    const root = tree()
    expect((await resolve(root, ['-'], { version: true })).items.map((i) => i.value)).toContain('--version')
    expect((await resolve(root, ['-'])).items.map((i) => i.value)).not.toContain('--version')
    expect((await resolve(root, ['build', '-'], { version: true })).items.map((i) => i.value)).not.toContain(
      '--version',
    )
  })

  test('nothing to offer asks the shell for filenames', async () => {
    expect(await directive('app build once ')).toBe('default')
    expect(await directive('app build ')).toBe('none')
    expect(await directive('app ')).toBe('none')
  })
})

describe('dynamic sources', () => {
  const dynamic = (complete: Arg.Complete): Cmd.Node =>
    Cmd.build('app').with(Cmd.build('checkout').arg(Arg.string('branch', { complete })))

  test('a function is awaited and its values offered', async () => {
    const root = dynamic(async () => ['main', 'next'])
    expect(await values('app checkout --branch ', root)).toEqual(['main', 'next'])
  })

  test('descriptions survive', async () => {
    const root = dynamic(() => [{ value: 'main', description: 'the trunk' }])
    expect((await resolve(root, ['checkout', '--branch', ''])).items).toEqual([
      { value: 'main', description: 'the trunk' },
    ])
  })

  test('it is told the partial word and the whole line', async () => {
    let seen: Arg.Context | undefined
    const root = dynamic((context) => {
      seen = context
      return []
    })

    await resolve(root, ['checkout', '--branch', 'ma'])
    expect(seen).toMatchObject({ word: 'ma', words: ['checkout', '--branch', 'ma'] })
    expect(seen?.arg.name).toBe('branch')
    expect(seen?.cmd.name).toBe('checkout')
  })

  test('a thrown or rejected source degrades rather than wedging the key', async () => {
    for (const complete of [
      (): never => {
        throw new Error('boom')
      },
      (): Promise<never> => Promise.reject(new Error('boom')),
    ]) {
      const result = await resolve(dynamic(complete), ['checkout', '--branch', ''])
      expect(result).toMatchObject({ items: [], directive: 'default' })
    }
  })

  test('a value carrying a tab or a newline is dropped, not mangled', async () => {
    const root = dynamic(() => ['ok', 'a\tb', 'c\nd', ''])
    expect(await values('app checkout --branch ', root)).toEqual(['ok'])
  })
})

describe('never throws', () => {
  const pieces = [
    '',
    '-',
    '--',
    '-a',
    '-abc',
    '-fe',
    '--x',
    '--x=1',
    '--no-force',
    '--env',
    'build',
    'run',
    'nosuch',
    '-5',
    '=',
    'deploy-api',
  ]

  test('over a few hundred arbitrary lines', async () => {
    const root = tree()

    for (let n = 0; n < 400; n++) {
      const length = 1 + Math.floor(Math.random() * 5)
      const line = Array.from({ length }, () => pieces[Math.floor(Math.random() * pieces.length)]!)

      expect(() => site(root, line), line.join('|')).not.toThrow()
      await expect(resolve(root, line), line.join('|')).resolves.toBeDefined()
    }
  })
})
