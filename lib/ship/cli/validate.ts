import type { Spec } from '../src/index.ts'

export interface Problem {
  level: 'error' | 'warn'
  path: string
  message: string
}

const keysOf = (value: unknown): string[] =>
  value == null ? [] : Array.isArray(value) ? value.map(String) : Object.keys(value as object)

const isBindMount = (source: string): boolean =>
  source.startsWith('.') || source.startsWith('/') || source.startsWith('~')

/**
 * The named volume a short mount string refers to, or undefined for anonymous volumes and
 * bind mounts. Windows drive letters and `${VAR}` interpolation both look like a `:` separator
 * or a volume name, so they are checked before splitting.
 */
const shortVolumeSource = (entry: string): string | undefined => {
  if (/^[A-Za-z]:[\\/]/.test(entry)) return undefined // C:\data:/data
  if (entry.includes('$')) return undefined // interpolated — compose resolves it, we can't
  const parts = entry.split(':')
  if (parts.length < 2) return undefined // anonymous volume
  const source = parts[0]!
  return isBindMount(source) ? undefined : source
}

const sourcesOf = (entries: unknown): string[] =>
  Array.isArray(entries)
    ? entries
        .map((e) => (typeof e === 'string' ? e : ((e as { source?: string })?.source ?? undefined)))
        .filter((s): s is string => typeof s === 'string')
    : []

/**
 * Check that every reference inside a generated compose file resolves.
 *
 * Deliberately shallow — the shape is already type-checked. This catches the mistakes types
 * cannot: a `depends_on` naming a service that was never composed, a network referenced but
 * not declared, a named volume that only exists in a mount string.
 */
export const validate = (spec: Spec): Problem[] => {
  const problems: Problem[] = []
  const services = spec.services ?? {}
  const declared = {
    service: new Set(Object.keys(services)),
    // `default` is the network compose creates implicitly for every project.
    network: new Set(['default', ...Object.keys(spec.networks ?? {})]),
    volume: new Set(Object.keys(spec.volumes ?? {})),
    secret: new Set(Object.keys(spec.secrets ?? {})),
    config: new Set(Object.keys(spec.configs ?? {})),
  }
  const used = {
    network: new Set<string>(),
    volume: new Set<string>(),
    secret: new Set<string>(),
    config: new Set<string>(),
  }

  const require_ = (kind: keyof typeof used, name: string, path: string): void => {
    used[kind].add(name)
    if (!declared[kind].has(name)) {
      problems.push({ level: 'error', path, message: `undeclared ${kind} "${name}"` })
    }
  }

  for (const [name, service] of Object.entries(services)) {
    if (service == null) continue
    const at = `services.${name}`

    if (!service.image && !service.build && !service.extends) {
      problems.push({ level: 'warn', path: at, message: 'has neither image nor build' })
    }

    for (const dependency of keysOf(service.depends_on)) {
      if (!declared.service.has(dependency)) {
        problems.push({ level: 'error', path: `${at}.depends_on`, message: `undeclared service "${dependency}"` })
      }
    }

    if (!service.network_mode) {
      for (const network of keysOf(service.networks)) require_('network', network, `${at}.networks`)
    }

    for (const entry of service.volumes ?? []) {
      // The long form defaults to `type: volume` when omitted.
      const source =
        typeof entry === 'string'
          ? shortVolumeSource(entry)
          : (entry.type ?? 'volume') === 'volume'
            ? entry.source
            : undefined
      if (source) require_('volume', source, `${at}.volumes`)
    }

    for (const source of sourcesOf(service.secrets)) require_('secret', source, `${at}.secrets`)
    for (const source of sourcesOf(service.configs)) require_('config', source, `${at}.configs`)
  }

  for (const kind of ['network', 'volume', 'secret', 'config'] as const) {
    for (const name of declared[kind]) {
      // Every service joins `default` implicitly, so it is never an orphan.
      if (kind === 'network' && name === 'default') continue
      if (!used[kind].has(name)) {
        problems.push({ level: 'warn', path: `${kind}s.${name}`, message: 'declared but never referenced' })
      }
    }
  }

  return problems
}

export const formatProblems = (problems: Problem[], label?: string): string =>
  problems
    .map((p) => `  ${p.level === 'error' ? 'error' : ' warn'}  ${label ? `${label} ` : ''}${p.path}: ${p.message}`)
    .join('\n')
