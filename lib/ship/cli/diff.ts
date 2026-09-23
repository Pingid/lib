import type { Spec } from '../src/index.ts'
import * as Load from './load.ts'

export declare namespace Diff {
  type Kind = 'service' | 'network' | 'volume'

  /**
   * `missing` and `orphan` are the two sides of the diff. `stale` is there but would be
   * replaced, `stopped` is there and unchanged but not up, `current` is in sync.
   */
  type Status = 'missing' | 'orphan' | 'stale' | 'stopped' | 'current'

  interface Entry {
    kind: Kind
    name: string
    status: Status
    detail?: string | undefined
  }

  /** One container, as `docker ps` reports it. */
  interface Container {
    service: string
    state: string
    hash: string
  }

  /** A network or volume, under the name docker actually gives it. */
  interface Resource {
    name: string
    external: boolean
  }

  /** What docker has right now. */
  interface Actual {
    containers: Container[]
    networks: Set<string>
    volumes: Set<string>
    /** The subset this project owns — what an orphan is measured against. */
    owned: { networks: Set<string>; volumes: Set<string> }
  }

  /** What compose would create from the generated file. */
  interface Desired {
    /** Service name to the config hash compose would stamp on a fresh container. */
    services: Record<string, string>
    networks: Resource[]
    volumes: Resource[]
  }
}

// ---------------- compare --------------------------
/**
 * Line up what compose would create against what docker has.
 *
 * Services are compared by compose's own config hash, the same value it uses to decide
 * whether a container needs recreating — so `stale` here means `up` would replace it.
 * Networks and volumes are compared by their resolved docker name, which is what makes an
 * external resource, named outside the project, resolve to the object it really points at.
 */
export const compare = (desired: Diff.Desired, actual: Diff.Actual): Diff.Entry[] => {
  const entries: Diff.Entry[] = []

  const running = new Map<string, Diff.Container[]>()
  for (const container of actual.containers) {
    if (container.service.length === 0) continue
    running.set(container.service, [...(running.get(container.service) ?? []), container])
  }

  for (const [service, hash] of Object.entries(desired.services)) {
    const containers = running.get(service) ?? []
    const states = count(containers.map((container) => container.state))

    if (containers.length === 0) {
      entries.push({ kind: 'service', name: service, status: 'missing', detail: 'no container' })
    } else if (containers.some((container) => container.hash !== hash)) {
      entries.push({ kind: 'service', name: service, status: 'stale', detail: `${states}, config changed` })
    } else if (containers.some((container) => container.state !== 'running')) {
      entries.push({ kind: 'service', name: service, status: 'stopped', detail: states })
    } else {
      entries.push({ kind: 'service', name: service, status: 'current', detail: states })
    }
  }

  for (const [service, containers] of running) {
    if (service in desired.services) continue
    entries.push({
      kind: 'service',
      name: service,
      status: 'orphan',
      detail: `${count(containers.map((container) => container.state))}, not in the config`,
    })
  }

  for (const [kind, group] of [
    ['network', 'networks'],
    ['volume', 'volumes'],
  ] as const) {
    for (const resource of desired[group]) {
      const there = actual[group].has(resource.name)
      const note = resource.external ? 'external' : undefined

      if (there) entries.push({ kind, name: resource.name, status: 'current', detail: note })
      // An external resource is declared, never created — a missing one is compose's error too.
      else entries.push({ kind, name: resource.name, status: 'missing', detail: note && `${note}, not found` })
    }

    const wanted = new Set(desired[group].map((resource) => resource.name))
    for (const name of actual.owned[group]) {
      if (!wanted.has(name)) entries.push({ kind, name, status: 'orphan', detail: 'not in the config' })
    }
  }

  return entries
}

export const drifted = (entries: Diff.Entry[]): boolean => entries.some((entry) => entry.status !== 'current')

const SIGIL: Record<Diff.Status, string> = {
  missing: '+',
  orphan: '-',
  stale: '~',
  stopped: '~',
  current: '=',
}

/** Column pairs for `Render.rows`: what would change, and what docker has to say about it. */
export const rows = (entries: Diff.Entry[]): Array<readonly [string, string | undefined]> =>
  entries.map((entry) => [`${SIGIL[entry.status]} ${entry.kind.padEnd(7)} ${entry.name}`, entry.detail] as const)

// ---------------- gather --------------------------
/** Networks and volumes docker knows about at all, which every stack is checked against. */
export const survey = async (): Promise<{ networks: Set<string>; volumes: Set<string> }> => {
  const [networks, volumes] = await Promise.all([
    Load.capture(['network', 'ls', '--format', '{{.Name}}']),
    Load.capture(['volume', 'ls', '--format', '{{.Name}}']),
  ])

  return { networks: new Set(names(networks)), volumes: new Set(names(volumes)) }
}

/** What docker holds for one compose project, found by the labels compose stamps on it. */
export const inspect = async (
  project: string,
  known: { networks: Set<string>; volumes: Set<string> },
): Promise<Diff.Actual> => {
  const label = `label=com.docker.compose.project=${project}`

  const [containers, networks, volumes] = await Promise.all([
    Load.capture([
      'ps',
      '-a',
      '--filter',
      label,
      '--format',
      '{{.Label "com.docker.compose.service"}}\t{{.State}}\t{{.Label "com.docker.compose.config-hash"}}',
    ]),
    Load.capture(['network', 'ls', '--filter', label, '--format', '{{.Name}}']),
    Load.capture(['volume', 'ls', '--filter', label, '--format', '{{.Name}}']),
  ])

  return {
    containers: records(containers).map(([service = '', state = '', hash = '']) => ({ service, state, hash })),
    networks: known.networks,
    volumes: known.volumes,
    owned: { networks: new Set(names(networks)), volumes: new Set(names(volumes)) },
  }
}

/** Ask compose what it would make of the generated file, rather than predicting it here. */
export const desired = async (spec: Spec, project: string, dir: string): Promise<Diff.Desired> => {
  const base = ['compose', '--project-name', project, '--project-directory', dir, '-f', '-']

  const [hashes, resolved] = await Promise.all([
    Load.capture([...base, 'config', '--hash=*'], spec),
    Load.capture([...base, 'config', '--format', 'json'], spec),
  ])

  const services: Record<string, string> = {}
  for (const line of names(hashes)) {
    const [service, hash] = line.split(/\s+/)
    if (service && hash) services[service] = hash
  }

  const config = JSON.parse(resolved) as {
    networks?: Record<string, { name?: string; external?: boolean }>
    volumes?: Record<string, { name?: string; external?: boolean }>
  }

  return { services, networks: declared(config.networks), volumes: declared(config.volumes) }
}

// ---------------- H --------------------------
const declared = (group: Record<string, { name?: string; external?: boolean }> = {}): Diff.Resource[] =>
  Object.entries(group).map(([key, value]) => ({ name: value?.name ?? key, external: value?.external === true }))

/** Docker's `--format` output, one record per line; a trailing empty field has to survive. */
const records = (out: string): string[][] => names(out).map((line) => line.split('\t'))

const names = (out: string): string[] =>
  out
    .split('\n')
    .map((line) => line.replace(/\r$/, ''))
    .filter((line) => line.trim().length > 0)

/** `2 running` · `1 running, 1 exited`, in the order docker listed them. */
const count = (states: string[]): string => {
  const totals = new Map<string, number>()
  for (const state of states) totals.set(state, (totals.get(state) ?? 0) + 1)
  return [...totals].map(([state, total]) => `${total} ${state}`).join(', ')
}
