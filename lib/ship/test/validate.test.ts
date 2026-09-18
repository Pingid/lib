import { expect, test } from 'vitest'

import { validate } from '../cli/validate.ts'
import type { Problem } from '../cli/validate.ts'

const errors = (problems: Problem[]): string[] =>
  problems.filter((p) => p.level === 'error').map((p) => `${p.path}: ${p.message}`)

test('catches a depends_on that names nothing', () => {
  const problems = validate({ services: { api: { image: 'api', depends_on: ['db'] } } })

  expect(errors(problems)).toStrictEqual(['services.api.depends_on: undeclared service "db"'])
})

test('accepts the long depends_on form', () => {
  const problems = validate({
    services: {
      api: { image: 'api', depends_on: { db: { condition: 'service_healthy' } } },
      db: { image: 'postgres:16' },
    },
  })

  expect(errors(problems)).toStrictEqual([])
})

test('catches an undeclared network', () => {
  const problems = validate({ services: { api: { image: 'api', networks: ['web'] } } })

  expect(errors(problems)).toStrictEqual(['services.api.networks: undeclared network "web"'])
})

test('ignores networks when network_mode is set', () => {
  const problems = validate({ services: { api: { image: 'api', network_mode: 'host' } } })

  expect(errors(problems)).toStrictEqual([])
})

test('tells named volumes apart from bind mounts', () => {
  const problems = validate({
    services: {
      api: {
        image: 'api',
        volumes: ['./src:/app', '/etc/hosts:/etc/hosts:ro', '~/.cache:/cache', '/anonymous', 'data:/var/lib/data'],
      },
    },
  })

  expect(errors(problems)).toStrictEqual(['services.api.volumes: undeclared volume "data"'])
})

test('reads the long volume form', () => {
  const problems = validate({
    services: { api: { image: 'api', volumes: [{ type: 'volume', source: 'data', target: '/data' }] } },
    volumes: { data: null },
  })

  expect(errors(problems)).toStrictEqual([])
})

test('checks secret and config sources', () => {
  const problems = validate({
    services: { api: { image: 'api', secrets: ['db_password'], configs: [{ source: 'nginx', target: '/etc/nginx' }] } },
  })

  expect(errors(problems)).toStrictEqual([
    'services.api.secrets: undeclared secret "db_password"',
    'services.api.configs: undeclared config "nginx"',
  ])
})

test('warns about orphans and services with nothing to run', () => {
  const problems = validate({ services: { api: {} }, networks: { unused: null } })

  expect(problems.filter((p) => p.level === 'warn').map((p) => `${p.path}: ${p.message}`)).toStrictEqual([
    'services.api: has neither image nor build',
    'networks.unused: declared but never referenced',
  ])
})

test('the implicit default network is not a missing reference', () => {
  const problems = validate({ services: { api: { image: 'api', networks: ['default'] } } })

  expect(problems).toStrictEqual([])
})

test('an external network satisfies a reference', () => {
  const problems = validate({
    services: { api: { image: 'api', networks: ['web'] } },
    networks: { web: { external: true, name: 'web' } },
  })

  expect(errors(problems)).toStrictEqual([])
})

test('windows bind mounts are not named volumes', () => {
  const problems = validate({ services: { api: { image: 'api', volumes: ['C:\\data:/data'] } } })

  expect(errors(problems)).toStrictEqual([])
})

test('interpolated mount sources are left alone', () => {
  const problems = validate({ services: { api: { image: 'api', volumes: ['${PWD}/src:/app'] } } })

  expect(errors(problems)).toStrictEqual([])
})

test('the long volume form defaults to type: volume', () => {
  const problems = validate({
    services: { api: { image: 'api', volumes: [{ type: 'volume', source: 'data', target: '/data' }] } },
    volumes: { data: null },
  })

  expect(problems).toStrictEqual([])
})

test('an explicitly declared default network is not an orphan', () => {
  const problems = validate({ services: { api: { image: 'api' } }, networks: { default: { driver: 'bridge' } } })

  expect(problems).toStrictEqual([])
})

test('a service that extends another needs no image of its own', () => {
  const problems = validate({ services: { api: { extends: { service: 'base', file: 'base.yml' } } } })

  expect(problems).toStrictEqual([])
})
