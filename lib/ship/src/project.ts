import { Registry, type Spec } from './registry.ts'
import { ContextValue } from './context.ts'
import { Scope } from './scope.ts'
import { Stack } from './stack.ts'

export type ProjectEntry = Stack<any> | ContextValue<any>

export class Project {
  /** Stack names in dependency order — dependencies first. */
  readonly order: string[] = []
  /** `[dependency, dependent]` pairs discovered through `ref()`. */
  readonly edges: Array<[string, string]> = []
  /** Generated compose file per stack name. */
  readonly specs: Record<string, Spec> = {}
  /** Docker project name per stack name. */
  readonly projects: Record<string, string> = {}

  private constructor(
    order: string[],
    edges: Array<[string, string]>,
    specs: Record<string, Spec>,
    projects: Record<string, string>,
  ) {
    this.order = order
    this.edges = edges
    this.specs = specs
    this.projects = projects
  }

  /**
   * Build every stack in a project.
   *
   * Top-level context values are visible to all stacks; a stack may also declare its own.
   * Cross-stack `ref()` calls are collected into a dependency order for the CLI to bring
   * stacks up in (and down in reverse).
   */
  static async build(...entries: ProjectEntry[]): Promise<Project> {
    const root = new Scope()
    const stacks: Stack<any>[] = []

    for (const entry of entries) {
      if (entry instanceof ContextValue) root.setContext(entry.context, entry.value)
      else if (entry instanceof Stack) stacks.push(entry)
      else throw new TypeError('project(): expected a Stack or a Context value')
    }

    const seen = new Set<string>()
    for (const s of stacks) {
      if (seen.has(s.name)) throw new Error(`duplicate stack "${s.name}"`)
      seen.add(s.name)
    }

    const specs: Record<string, Spec> = {}
    const projects: Record<string, string> = {}
    const edges: Array<[string, string]> = []

    for (const s of stacks) {
      const registry = new Registry(root.child())
      registry.self = s
      registry.registerAll(s.items)
      // `name` first so the generated file reads like a hand-written one.
      const spec: Spec = { name: s.project, ...(await registry.resolve()) }
      specs[s.name] = spec
      projects[s.name] = s.project
      for (const dependency of registry.dependsOn) {
        if (dependency === s.name) continue
        if (!seen.has(dependency)) {
          throw new Error(`stack "${s.name}" references stack "${dependency}", which is not part of this project`)
        }
        edges.push([dependency, s.name])
      }
    }

    return new Project(
      topological(
        stacks.map((s) => s.name),
        edges,
      ),
      edges,
      specs,
      projects,
    )
  }
}

/** Kahn's algorithm, stable in declaration order. */
const topological = (nodes: string[], edges: Array<[string, string]>): string[] => {
  const incoming = new Map<string, Set<string>>(nodes.map((n) => [n, new Set()]))
  for (const [from, to] of edges) incoming.get(to)?.add(from)

  const order: string[] = []
  const remaining = new Set(nodes)

  while (remaining.size > 0) {
    const ready = nodes.filter((n) => remaining.has(n) && [...incoming.get(n)!].every((d) => !remaining.has(d)))
    if (ready.length === 0) {
      throw new Error(`cycle between stacks: ${[...remaining].join(' -> ')}`)
    }
    for (const n of ready) {
      order.push(n)
      remaining.delete(n)
    }
  }

  return order
}
