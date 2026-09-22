import type ts from 'typescript'

import * as Ast from './ast.ts'
import { Emit, bind, type Shape } from './emit.ts'
import type { Api } from './model.ts'

export type PrintOptions = Shape & {
  /** Text placed above the output. */
  banner?: string
  /**
   * Swallows the warning about references that resolved to nothing. Those emit as `unknown`,
   * which compiles and so goes unnoticed — usually it means a `Decl.ref` was handed a name
   * where it wanted an id, or an op dropped a declaration something still points at.
   */
  silent?: boolean
  /**
   * The whole file, for layouts `root` and `route` do not reach. It receives the model with
   * every name settled and every reference bound, so `Emit.*` and `Decl.ref` are interchangeable
   * with hand-built nodes here. Defaults to `Emit.file`.
   */
  emit?: (api: Api) => ts.Node[]
}

/** Renders the model as TypeScript source. */
export const print = (api: Api, options: PrintOptions = {}): string =>
  (options.banner ?? Banner) + Ast.print(nodes(api, options))

/** Renders the model as AST, for callers splicing it into a larger file. */
export const nodes = (api: Api, options: PrintOptions = {}): ts.Node[] => {
  const lost = Emit.unresolved(api)

  if (lost.length && !options.silent)
    console.warn(`Emitting unknown for ${lost.length} reference(s) with nothing behind them:\n  ${lost.join('\n  ')}`)

  const bound = bind(api)

  return options.emit ? options.emit(bound) : Emit.file(bound, options)
}

const Banner = '/** Generated from an OpenAPI document. Do not edit. */\n\n'
