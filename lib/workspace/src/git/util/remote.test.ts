import { afterEach, expect, test, vi } from 'vitest'

import { default_origin, parse_origin } from './remote.ts'

afterEach(() => vi.unstubAllEnvs())

test('an https remote is parsed, with or without the .git suffix', () => {
  expect(parse_origin('https://github.com/Pingid/lib.git')).toEqual({
    owner: 'Pingid',
    repo: 'lib',
    origin: 'https://github.com/Pingid/lib.git',
  })
  expect(parse_origin('https://github.com/Pingid/lib')).toMatchObject({ owner: 'Pingid', repo: 'lib' })
})

test('scp-style and ssh remotes are parsed, including a port and userinfo', () => {
  expect(parse_origin('git@github.com:Pingid/lib.git')).toMatchObject({ owner: 'Pingid', repo: 'lib' })
  expect(parse_origin('ssh://git@github.com/Pingid/lib.git')).toMatchObject({ owner: 'Pingid', repo: 'lib' })
  expect(parse_origin('ssh://git@host:2222/Pingid/lib.git')).toMatchObject({ owner: 'Pingid', repo: 'lib' })
  expect(parse_origin('https://user:token@github.com/Pingid/lib.git')).toMatchObject({ owner: 'Pingid', repo: 'lib' })
})

test('the owner is the segment before the repository, so nested groups resolve', () => {
  expect(parse_origin('https://gitlab.com/group/sub/lib.git')).toMatchObject({ owner: 'sub', repo: 'lib' })
})

test('the owner/repo shorthand is expanded to the canonical origin', () => {
  expect(parse_origin('Pingid/lib')).toEqual({
    owner: 'Pingid',
    repo: 'lib',
    origin: 'https://github.com/Pingid/lib.git',
  })
})

test('trailing slashes and surrounding whitespace are ignored', () => {
  expect(parse_origin('  https://github.com/Pingid/lib.git/ \n')).toMatchObject({ owner: 'Pingid', repo: 'lib' })
})

test('something that names no repository is rejected rather than half-parsed', () => {
  expect(parse_origin('')).toBeUndefined()
  expect(parse_origin('   ')).toBeUndefined()
  expect(parse_origin('https://github.com/Pingid')).toBeUndefined()
})

test('GITHUB_SERVER_URL redirects the canonical origin, however it is punctuated', () => {
  vi.stubEnv('GITHUB_SERVER_URL', 'https://git.example.com/')
  expect(default_origin('Pingid', 'lib')).toBe('https://git.example.com/Pingid/lib.git')
})
