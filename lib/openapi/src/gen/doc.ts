import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  BaseResolver,
  Source as RedoclySource,
  bundle,
  createConfig,
  lintDocument,
  makeDocumentFromString,
  type Config,
  type Document,
  type NormalizedProblem,
} from '@redocly/openapi-core'
import * as oas from 'openapi-typescript'

/** A document, the text of one, or somewhere to fetch one from. */
export type Source = string | URL | oas.OpenAPI3

export type DocOptions = {
  /** Redocly config. Defaults to the `minimal` ruleset, matching openapi-typescript. */
  config?: Config
  /** Base for relative locations. Defaults to `process.cwd()`. */
  cwd?: string
  /** Swallows warnings. Errors always throw. */
  silent?: boolean
}

/** The OpenAPI document itself: fetching it, validating it, and the context its transforms need. */
export const Doc = {
  /** The ruleset openapi-typescript runs with: enough to reject a broken document, not enough to be noisy. */
  config: (): Promise<Config> => createConfig({}, { extends: ['minimal'] }),

  /** Validates a document and bundles its external `$ref`s into `components`. */
  load: async (source: Source, options: DocOptions = {}): Promise<oas.OpenAPI3> => {
    const config = options.config ?? (await Doc.config())
    const resolver = new BaseResolver(config.resolve)
    const doc = await locate(source, resolver, options.cwd ?? process.cwd())

    report(await lintDocument({ document: doc, config: config.styleguide, externalRefResolver: resolver }), options)

    const bundled = await bundle({ config, doc, externalRefResolver: resolver, dereference: false })
    report(bundled.problems, options)

    return bundled.bundle.parsed as oas.OpenAPI3
  },

  /**
   * The `GlobalContext` every openapi-typescript transform expects. Its own CLI builds
   * this inline; the flags below are that default set, all off bar the two named.
   */
  context: (doc: oas.OpenAPI3, redoc: Config, over: Partial<oas.GlobalContext> = {}): oas.GlobalContext => ({
    ...(Object.fromEntries(Flags.map((flag) => [flag, false])) as Record<(typeof Flags)[number], boolean>),
    defaultNonNullable: true,
    silent: true,
    discriminators: oas.scanDiscriminators(doc, {}),
    injectFooter: [],
    postTransform: undefined,
    transform: undefined,
    transformProperty: undefined,
    redoc,
    resolve: <T>($ref: string) => oas.resolveRef<T>(doc, $ref, { silent: true }),
    ...over,
  }),
}

const Flags = [
  'additionalProperties',
  'alphabetize',
  'arrayLength',
  'conditionalEnums',
  'dedupeEnums',
  'defaultNonNullable',
  'emptyObjectsUnknown',
  'enum',
  'enumValues',
  'excludeDeprecated',
  'exportType',
  'generatePathParams',
  'immutable',
  'makePathsEnum',
  'pathParamsAsTypes',
  'propertiesRequiredByDefault',
  'readWriteMarkers',
  'rootTypes',
  'rootTypesKeepCasing',
  'rootTypesNoSchemaPrefix',
  'silent',
] as const

/** Strings that name a place rather than carry a document. */
const LOCATION_RE = /^(https?|file):\/\/|^\.{0,2}\/|\.(json|ya?ml)$/

const locate = async (source: Source, resolver: BaseResolver, cwd: string): Promise<Document> => {
  const root = path.join(cwd, 'openapi.yaml')

  if (typeof source === 'object' && !(source instanceof URL))
    return { source: new RedoclySource(root, JSON.stringify(source), 'application/json'), parsed: source }

  if (typeof source === 'string' && !LOCATION_RE.test(source)) return makeDocumentFromString(source, root)

  const resolved = await resolver.resolveDocument(null, absolute(source, cwd), true)
  if ('parsed' in resolved) return resolved

  throw resolved.originalError
}

const absolute = (source: string | URL, cwd: string): string => {
  const url = source instanceof URL ? source : /^(https?|file):\/\//.test(source) ? new URL(source) : undefined

  if (!url) return path.resolve(cwd, source as string)

  return url.protocol === 'file:' ? fileURLToPath(url) : url.href
}

const report = (problems: NormalizedProblem[], options: DocOptions) => {
  const fatal = problems.filter((p) => p.severity === 'error')

  if (fatal.length) throw new Error(fatal.map(describe).join('\n'))
  if (!options.silent) for (const problem of problems) console.warn(describe(problem))
}

const describe = (problem: NormalizedProblem): string => {
  const at = problem.location?.[0]?.pointer

  return at ? `${problem.message} at ${at}` : problem.message
}
