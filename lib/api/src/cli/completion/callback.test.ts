import { execFileSync } from 'node:child_process'
import { describe, expect, test } from 'vitest'

import { Arg } from '../arg.ts'
import { Cli } from '../cli.ts'
import { Cmd } from '../cmd.ts'
import { Sink } from '../core/render.ts'
import { MARKER, callback } from './callback.ts'

const tree = (): Cmd.Node =>
  Cmd.build('app')
    .option(Arg.string('config', { complete: 'file' }))
    .with(
      Cmd.build('build').arg(Arg.enum(['dev', 'prod'] as const, 'env', { description: 'Target' })),
      Cmd.build('boom').arg(
        Arg.string('x', {
          complete: () => {
            throw new Error('boom')
          },
        }),
      ),
    )

const wire = async (argv: string[], options = {}): Promise<string> => {
  const out = new Sink()
  await callback(tree(), argv, { ...options, out })
  return out.value
}

describe('callback', () => {
  test('emits one candidate per line, then a directive trailer', async () => {
    expect(await wire(['--', 'build', '--env', ''])).toBe('dev\nprod\n:none\n')
  })

  test('carries a description after a tab', async () => {
    expect(await wire(['--', 'build', '-'])).toContain('--env\tTarget')
  })

  test('the trailer is always present, even with nothing to offer', async () => {
    expect(await wire(['--', 'build', 'x', ''])).toBe(':default\n')
    expect(await wire(['--', '--config', ''])).toBe(':file\n')
  })

  test('strips the mandatory `--`, so a leading flag is never eaten', async () => {
    expect(await wire(['--', '--config', ''])).toBe(await wire(['--config', '']))
  })

  test('no words is the same as one empty word', async () => {
    expect(await wire(['--'])).toBe(await wire(['--', '']))
    expect(await wire(['--'])).toContain('build')
  })

  test('offers --version only when the CLI has one', async () => {
    expect(await wire(['--', '-'], { version: true })).toContain('--version')
    expect(await wire(['--', '-'])).not.toContain('--version')
  })

  test('a thrown source degrades to the filename fallback', async () => {
    expect(await wire(['--', 'boom', '--x', ''])).toBe(':default\n')
  })

  test('always resolves 0, so a driver can tell it apart from a missing binary', async () => {
    const out = new Sink()
    expect(await callback(tree(), ['--', 'boom', '--x', ''], { out })).toBe(0)
  })
})

describe('interception', () => {
  const run = async (argv: string[], config = {}) => {
    const out = new Sink()
    const err = new Sink()
    const code = await Cli.for(tree(), { ...config, out, err }).run(argv)
    return { code, out: out.value, err: err.value }
  }

  test(`\`${MARKER}\` is answered before routing, and never reports an error`, async () => {
    expect(await run([MARKER, '--', 'build', '--env', ''])).toEqual({ code: 0, out: 'dev\nprod\n:none\n', err: '' })
  })

  test('it stays out of the command tree, so help and errors are unchanged', async () => {
    const root = tree()
    expect(root.find(MARKER)).toBeUndefined()
    expect(root.commands.map((child) => child.name)).toEqual(['build', 'boom'])
  })

  test('--version is derived from the config rather than declared twice', async () => {
    expect((await run([MARKER, '--', '-'], { version: '1.0.0' })).out).toContain('--version')
    expect((await run([MARKER, '--', '-'])).out).not.toContain('--version')
  })
})

/** `test-app` is installed on PATH by `lib/api/package.json`; skip where it is not runnable. */
const installed = ((): boolean => {
  try {
    execFileSync('test-app', ['--help'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
})()

describe.runIf(installed)('the installed binary', () => {
  const ask = (...words: string[]): string => execFileSync('test-app', [MARKER, '--', ...words], { encoding: 'utf8' })

  test('answers over the real process boundary', () => {
    expect(ask('build', '--env', '')).toBe('dev\nprod\n:none\n')
  })

  test('runs a dynamic source in-process', () => {
    expect(ask('deployApi', '--branch', '').trim().split('\n').at(-1)).toBe(':none')
  })
})
