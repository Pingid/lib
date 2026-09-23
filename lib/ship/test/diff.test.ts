import { expect, test } from 'vitest'

import { compare, drifted, type Diff } from '../cli/diff.ts'

const actual = (p: Partial<Diff.Actual> = {}): Diff.Actual => ({
  containers: [],
  networks: new Set(),
  volumes: new Set(),
  owned: { networks: new Set(), volumes: new Set() },
  ...p,
})

const desired = (p: Partial<Diff.Desired> = {}): Diff.Desired => ({
  services: {},
  networks: [],
  volumes: [],
  ...p,
})

const shown = (entries: Diff.Entry[]): string[] =>
  entries.map((entry) => [entry.status, entry.kind, entry.name, entry.detail].filter(Boolean).join(' '))

test('a service with no container would be created', () => {
  const entries = compare(desired({ services: { api: 'aaa' } }), actual())

  expect(shown(entries)).toStrictEqual(['missing service api no container'])
})

test('a container whose hash no longer matches would be recreated', () => {
  const entries = compare(
    desired({ services: { api: 'aaa' } }),
    actual({ containers: [{ service: 'api', state: 'running', hash: 'bbb' }] }),
  )

  expect(shown(entries)).toStrictEqual(['stale service api 1 running, config changed'])
})

test('an unchanged container that is not up reads as stopped, not stale', () => {
  const entries = compare(
    desired({ services: { api: 'aaa' } }),
    actual({ containers: [{ service: 'api', state: 'exited', hash: 'aaa' }] }),
  )

  expect(shown(entries)).toStrictEqual(['stopped service api 1 exited'])
})

test('replicas are counted, and one odd container out makes the whole service stale', () => {
  const entries = compare(
    desired({ services: { api: 'aaa' } }),
    actual({
      containers: [
        { service: 'api', state: 'running', hash: 'aaa' },
        { service: 'api', state: 'running', hash: 'aaa' },
      ],
    }),
  )

  expect(shown(entries)).toStrictEqual(['current service api 2 running'])
  expect(drifted(entries)).toBe(false)

  const stale = compare(
    desired({ services: { api: 'aaa' } }),
    actual({
      containers: [
        { service: 'api', state: 'running', hash: 'aaa' },
        { service: 'api', state: 'running', hash: 'bbb' },
      ],
    }),
  )

  expect(shown(stale)).toStrictEqual(['stale service api 2 running, config changed'])
})

test('a container for a service the config dropped is an orphan', () => {
  const entries = compare(desired(), actual({ containers: [{ service: 'legacy', state: 'exited', hash: 'aaa' }] }))

  expect(shown(entries)).toStrictEqual(['orphan service legacy 1 exited, not in the config'])
})

test('a container carrying no compose service label is ignored', () => {
  const entries = compare(desired(), actual({ containers: [{ service: '', state: 'running', hash: '' }] }))

  expect(entries).toStrictEqual([])
})

test('networks and volumes are matched on the name docker gives them', () => {
  const entries = compare(
    desired({
      networks: [{ name: 'app_default', external: false }],
      volumes: [{ name: 'app_data', external: false }],
    }),
    actual({ networks: new Set(['app_default']), volumes: new Set() }),
  )

  expect(shown(entries)).toStrictEqual(['current network app_default', 'missing volume app_data'])
})

test('an external resource is flagged as such, and says so when it is absent', () => {
  const here = compare(
    desired({ networks: [{ name: 'edge', external: true }] }),
    actual({ networks: new Set(['edge']) }),
  )
  const gone = compare(desired({ networks: [{ name: 'edge', external: true }] }), actual())

  expect(shown(here)).toStrictEqual(['current network edge external'])
  expect(shown(gone)).toStrictEqual(['missing network edge external, not found'])
})

test('a project-owned resource the config no longer declares is an orphan', () => {
  const entries = compare(
    desired(),
    actual({ volumes: new Set(['app_old']), owned: { networks: new Set(), volumes: new Set(['app_old']) } }),
  )

  expect(shown(entries)).toStrictEqual(['orphan volume app_old not in the config'])
})

test('drift is anything that is not already current', () => {
  expect(drifted([{ kind: 'service', name: 'api', status: 'current' }])).toBe(false)
  expect(drifted([{ kind: 'service', name: 'api', status: 'stopped' }])).toBe(true)
})
