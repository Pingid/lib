import { describe, expect, test } from 'vitest'
import { Type } from '@sinclair/typebox'

import { Arg } from '../arg.ts'
import { Cmd } from '../cmd.ts'
import { c } from '../index.ts'
import { of } from './table.ts'

const tree = (): Cmd.Node =>
  Cmd.build('app')
    .option(Arg.string('config', { alias: 'c', description: 'Config path', complete: 'file' }))
    .with(
      Cmd.build('build')
        .describe('Build the project')
        .arg(
          Arg.boolean('watch', { alias: 'w', description: 'Rebuild on change' }),
          Arg.enum(['dev', 'prod'] as const, 'env', { description: 'Target environment' }),
          Arg.string('target', { positional: true }),
        ),
      Cmd.build('deployApi')
        .describe('Deploy the api')
        .arg(Arg.array(Arg.string(), 'services', { positional: true })),
    )

const at = (root: Cmd.Node, path: string, options = {}) => {
  const entry = of(root, options).find((candidate) => candidate.path.join(' ') === path)
  if (!entry) throw new Error(`No entry for '${path}'`)
  return entry
}

const flag = (root: Cmd.Node, path: string, name: string) => {
  const found = at(root, path).flags.find((candidate) => candidate.names.includes(name))
  if (!found) throw new Error(`No flag '${name}' at '${path}'`)
  return found
}

describe('of', () => {
  test('flattens every reachable path, kebabbing camelCase names', () => {
    expect(of(tree()).map((entry) => entry.path)).toEqual([[], ['build'], ['deploy-api']])
  })

  test('lists subcommands with descriptions', () => {
    expect(at(tree(), '').commands).toEqual([
      { value: 'build', description: 'Build the project' },
      { value: 'deploy-api', description: 'Deploy the api' },
    ])
  })

  test('carries inherited options down to every descendant', () => {
    expect(flag(tree(), 'build', '--config').names).toEqual(['--config', '-c'])
  })

  test('synthesises help, and version only at the root when asked', () => {
    const names = (path: string, options = {}) =>
      of(tree(), options)
        .find((e) => e.path.join(' ') === path)!
        .flags.flatMap((f) => f.names)

    expect(names('')).toContain('--help')
    expect(names('')).toContain('-h')
    expect(names('')).not.toContain('--version')
    expect(names('', { version: true })).toContain('--version')
    expect(names('build', { version: true })).not.toContain('--version')
  })

  test('a boolean takes no value and completes true/false', () => {
    expect(flag(tree(), 'build', '--watch')).toMatchObject({ takes: false, spec: ['true', 'false'] })
  })

  test('declared choices become the spec without being asked for', () => {
    expect(flag(tree(), 'build', '--env')).toMatchObject({ takes: true, spec: ['dev', 'prod'] })
  })

  test('a shell-native source passes through', () => {
    expect(flag(tree(), '', '--config').spec).toBe('file')
  })

  test('a variadic positional is the last reachable slot', () => {
    expect(at(tree(), 'deploy-api')).toMatchObject({ variadic: true, positionals: [undefined] })
    expect(at(tree(), 'build')).toMatchObject({ variadic: false, positionals: [undefined] })
  })

  test('drops positionals parse could never reach past a variadic', () => {
    const cmd = Cmd.build('run').arg(
      Arg.array(Arg.string(), 'args', { positional: true }),
      Arg.string('tail', { positional: true }),
    )

    expect(at(cmd, '').positionals).toHaveLength(1)
  })
})

describe('complete', () => {
  test('attaches a source to a schema-declared arg', () => {
    const cmd = Cmd.build('deploy')
      .in(Type.Object({ env: Type.String(), out: Type.Optional(Type.String()) }))
      .complete({ env: ['dev', 'prod'], out: 'dir' })

    expect(flag(cmd, '', '--env').spec).toEqual(['dev', 'prod'])
    expect(flag(cmd, '', '--out').spec).toBe('dir')
  })

  test('rejects a name the command never declared', () => {
    expect(() => Cmd.build('deploy').complete({ nope: 'file' })).toThrow(/Unknown arg 'nope'/)
  })

  test('an override on the declaring command reaches the whole subtree', () => {
    const root = Cmd.build('app').option(Arg.string('config')).complete({ config: 'file' }).with(Cmd.build('build'))

    expect(flag(root, 'build', '--config').spec).toBe('file')
  })

  test('a command-level override beats the arg it was declared on', () => {
    const arg = Arg.string('branch', { complete: 'file' })
    const cmd = Cmd.build('checkout')
      .arg(arg)
      .complete({ branch: ['main', 'next'] })

    expect(flag(cmd, '', '--branch').spec).toEqual(['main', 'next'])
  })

  test('the macro carries a source through without polluting the schema', () => {
    const cmd = c.cmd({
      name: 'deploy',
      options: { env: c.enum(['dev', 'prod'], 'Target'), config: c.str({ complete: 'file' }) },
      handle: () => undefined,
    })

    expect(flag(cmd, '', '--config').spec).toBe('file')
    expect(flag(cmd, '', '--env').spec).toEqual(['dev', 'prod'])
    expect(JSON.stringify(cmd.args.map((a) => a.json))).not.toContain('complete')
  })
})
