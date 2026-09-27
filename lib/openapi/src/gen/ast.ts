import ts from 'typescript'
import {
  NEVER,
  QUESTION_TOKEN,
  STRING,
  UNKNOWN,
  addJSDocComment,
  astToString,
  tsModifiers,
  tsPropertyIndex,
} from 'openapi-typescript'

export { NEVER, NUMBER, STRING, UNKNOWN, tsIntersection as intersection, tsUnion as union } from 'openapi-typescript'

const f = ts.factory

/** What a doc comment carries: a bare description, or a summary line, a description and a deprecation. */
export type Docs = string | { summary?: string; description?: string; deprecated?: boolean }

/** One member of an object type. */
export type Field = { name: string; type: ts.TypeNode; optional?: boolean; docs?: Docs }

export const obj = (fields: Field[]): ts.TypeLiteralNode => f.createTypeLiteralNode(fields.map(prop))

export const prop = (field: Field): ts.PropertySignature =>
  docs(
    f.createPropertySignature(
      undefined,
      tsPropertyIndex(field.name),
      field.optional ? QUESTION_TOKEN : undefined,
      field.type,
    ),
    field.docs,
  )

export const alias = (
  name: string,
  type: ts.TypeNode,
  description?: Docs,
  params?: readonly string[],
): ts.TypeAliasDeclaration =>
  docs(
    f.createTypeAliasDeclaration(
      tsModifiers({ export: true }),
      name,
      params?.map((param) => f.createTypeParameterDeclaration(undefined, param)),
      type,
    ),
    description,
  )

export const iface = (name: string, members: readonly ts.TypeElement[]): ts.InterfaceDeclaration =>
  f.createInterfaceDeclaration(tsModifiers({ export: true }), name, undefined, undefined, members)

export const literal = (value: string): ts.TypeNode => f.createLiteralTypeNode(f.createStringLiteral(value))

export const ref = (name: string, args?: readonly ts.TypeNode[]): ts.TypeReferenceNode =>
  f.createTypeReferenceNode(f.createIdentifier(name), args)

/** `Target["a"]["b"]` — the type-level read of a nested member. */
export const index = (target: ts.TypeNode, path: readonly string[]): ts.TypeNode =>
  path.reduce<ts.TypeNode>((node, key) => f.createIndexedAccessTypeNode(node, literal(key)), target)

/** `Record<K, V>`, with `Record<string, string>` the usual case. */
export const dict = (key: ts.TypeNode = STRING, value: ts.TypeNode = STRING): ts.TypeNode =>
  f.createTypeReferenceNode(f.createIdentifier('Record'), [key, value])

/**
 * The value half. Everything above builds types; a generated file that carries runtime code —
 * a table of request builders, a list of urls — needs expressions and statements as well.
 */

/** One member of a value object: a named property, or a spread of another object. */
export type Entry = { name: string; value: ts.Expression } | { spread: ts.Expression }

/** A value object literal, `{ a: 1, ...rest }`. The type-level twin is `obj`. */
export const record = (entries: Entry[]): ts.ObjectLiteralExpression =>
  f.createObjectLiteralExpression(
    entries.map((entry) =>
      'spread' in entry
        ? f.createSpreadAssignment(entry.spread)
        : f.createPropertyAssignment(tsPropertyIndex(entry.name), entry.value),
    ),
    true,
  )

/** `export const name = value`. */
export const constant = (name: string, value: ts.Expression, type?: ts.TypeNode): ts.VariableStatement =>
  f.createVariableStatement(
    tsModifiers({ export: true }),
    f.createVariableDeclarationList([f.createVariableDeclaration(name, undefined, type, value)], ts.NodeFlags.Const),
  )

/** `(a, b) => body`. An object literal body gets its parentheses from the printer. */
export const arrow = (params: readonly ts.ParameterDeclaration[], body: ts.Expression): ts.ArrowFunction =>
  f.createArrowFunction(undefined, undefined, params, undefined, undefined, body)

export const param = (
  name: string,
  type?: ts.TypeNode,
  options: { optional?: boolean; fallback?: ts.Expression } = {},
): ts.ParameterDeclaration =>
  f.createParameterDeclaration(
    undefined,
    undefined,
    name,
    options.optional ? QUESTION_TOKEN : undefined,
    type,
    options.fallback,
  )

export const call = (target: ts.Expression, args: readonly ts.Expression[] = []): ts.CallExpression =>
  f.createCallExpression(target, undefined, args)

export const id = (name: string): ts.Identifier => f.createIdentifier(name)

/** `value ?? fallback`. */
export const coalesce = (value: ts.Expression, fallback: ts.Expression): ts.Expression =>
  f.createBinaryExpression(value, ts.SyntaxKind.QuestionQuestionToken, fallback)

export const str = (value: string): ts.StringLiteral => f.createStringLiteral(value)

/** `target.name`, falling back to `target["name"]` where the name is not a legal identifier. */
export const member = (target: ts.Expression, name: string): ts.Expression =>
  IDENTIFIER_RE.test(name)
    ? f.createPropertyAccessExpression(target, name)
    : f.createElementAccessExpression(target, str(name))

/**
 * A template literal from alternating text and expressions: `template(['/things/', expr, '/tags'])`.
 * Text with no expressions beside it comes back as a plain string literal instead.
 */
export const template = (parts: (string | ts.Expression)[]): ts.Expression => {
  const spans: { value: ts.Expression; after: string }[] = []
  let head = ''

  for (const part of parts) {
    if (typeof part !== 'string') spans.push({ value: part, after: '' })
    else if (spans.length) spans[spans.length - 1]!.after += part
    else head += part
  }

  if (!spans.length) return str(head)

  return f.createTemplateExpression(
    f.createTemplateHead(head),
    spans.map((span, i) =>
      f.createTemplateSpan(
        span.value,
        i === spans.length - 1 ? f.createTemplateTail(span.after) : f.createTemplateMiddle(span.after),
      ),
    ),
  )
}

/**
 * Parses TypeScript into statements. Fixed runtime code — a helper the generated file calls —
 * is far easier read and maintained as source than as a stack of factory calls.
 */
export const source = (code: string): ts.Statement[] => [
  ...ts.createSourceFile('gen.ts', code, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS).statements,
]

const IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/

/** openapi-typescript types its JSDoc helper for property signatures; the underlying API is not that narrow. */
export const docs = <T extends ts.Node>(node: T, docs?: Docs): T => {
  const { summary, description, deprecated } = typeof docs === 'string' ? { description: docs } : (docs ?? {})

  if (summary || description || deprecated)
    addJSDocComment({ summary, description, deprecated }, node as unknown as ts.PropertySignature)

  return node
}

/**
 * Bottom-up rewrite of a type tree. Children are rewritten before their parent,
 * so `visitor` always sees nodes whose descendants are already final.
 */
export const rewrite = <T extends ts.Node>(node: T, visitor: (n: ts.Node) => ts.Node): T => {
  const result = ts.transform<T>(node, [
    (ctx) => {
      const step = (n: ts.Node): ts.Node => visitor(ts.visitEachChild(n, step, ctx))
      return (n) => step(n) as T
    },
  ])

  const [out] = result.transformed
  result.dispose()

  return out ?? node
}

/** Every node in a tree, parents before children. */
export const walk = function* (node: ts.Node): Generator<ts.Node> {
  yield node
  for (const child of children(node)) yield* walk(child)
}

export type CollapseOptions = {
  /**
   * Also drops union members another member already admits, and intersection members
   * another member already implies: `{ a: string } | { a?: string }` becomes `{ a?: string }`,
   * because every value of the first is a value of the second.
   *
   * The result is the same type, but a less descriptive one — `{ id: string; at: string }`
   * folds into `{ id: string }`, and `"a" | string` into `string`. Off by default.
   */
  subsume?: boolean
}

/**
 * Collapses the matching members of every union and intersection in a tree.
 *
 * `tsUnion` only dedupes primitives by kind, so a union built from several responses that
 * happen to share a shape keeps one member per response:
 *
 * ```ts
 * // { message: string } | { message: string } | { message?: string } | { message?: string }
 * collapse(type)                     // { message: string } | { message?: string }
 * collapse(type, { subsume: true })  // { message?: string }
 * ```
 *
 * Matching is structural and blind to the order of union, intersection and object members,
 * so `{ a: string; b: number }` and `{ b: number; a: string }` count as one. A union left
 * with a single member unwraps to that member.
 *
 * The members that carry nothing go either way: `never | T` and `unknown & T` reduce to `T`,
 * and `unknown | T` and `never & T` to `unknown` and `never`. Those hold whatever `T` is,
 * so they apply without `subsume` — a reply with no content intersected with a status tag
 * leaves a `never` that would otherwise sit in the union unread.
 */
export const collapse = <T extends ts.Node>(node: T, options: CollapseOptions = {}): T =>
  rewrite(node, (n) => {
    if (ts.isUnionTypeNode(n)) return fold(n.types, options.subsume ? covers : same, Union)
    if (ts.isIntersectionTypeNode(n)) return fold(n.types, options.subsume ? flip(covers) : same, Intersection)
    if (ts.isParenthesizedTypeNode(n) && atomic(n.type)) return n.type

    return n
  })

/** True when two types have the same shape, whatever order their members are written in. */
export const same = (a: ts.TypeNode, b: ts.TypeNode): boolean => key(a) === key(b)

/** True when every value of `narrow` is also a value of `wide`. Structural, and deliberately shy: unsure means false. */
export const covers = (wide: ts.TypeNode, narrow: ts.TypeNode): boolean => {
  if (same(wide, narrow)) return true
  if (wide.kind === ts.SyntaxKind.UnknownKeyword || wide.kind === ts.SyntaxKind.AnyKeyword) return true
  if (narrow.kind === ts.SyntaxKind.NeverKeyword) return true
  if (ts.isParenthesizedTypeNode(wide)) return covers(wide.type, narrow)
  if (ts.isParenthesizedTypeNode(narrow)) return covers(wide, narrow.type)
  if (ts.isUnionTypeNode(narrow)) return narrow.types.every((type) => covers(wide, type))
  if (ts.isUnionTypeNode(wide)) return wide.types.some((type) => covers(type, narrow))
  if (ts.isArrayTypeNode(wide) && ts.isArrayTypeNode(narrow)) return covers(wide.elementType, narrow.elementType)
  if (ts.isTypeLiteralNode(wide)) return ts.isTypeLiteralNode(narrow) && wide.members.every((m) => holds(m, narrow))
  if (ts.isLiteralTypeNode(narrow)) return widens(wide, narrow.literal)

  return false
}

/**
 * A canonical string for a type: equal keys mean the same shape. Union, intersection and
 * object members are sorted, so the key does not move when the order does.
 */
export const key = (node: ts.TypeNode): string => {
  const cached = keys.get(node)

  if (cached !== undefined) return cached

  const computed = canonical(node)

  keys.set(node, computed)

  return computed
}

/** Type nodes that carry no information: `never`, `{}`, `Record<string, never>`. */
export const empty = (node: ts.TypeNode | undefined): boolean => {
  if (!node) return true
  if (node.kind === ts.SyntaxKind.NeverKeyword) return true
  if (ts.isTypeLiteralNode(node)) return node.members.length === 0
  if (ts.isTypeReferenceNode(node) && name(node) === 'Record')
    return node.typeArguments?.[1]?.kind === ts.SyntaxKind.NeverKeyword

  return false
}

/** The identifier a type reference points at, when it is a bare name. */
export const name = (node: ts.TypeReferenceNode): string | undefined =>
  ts.isIdentifier(node.typeName) ? node.typeName.text : undefined

/**
 * A reference named by a JSON pointer: the placeholder a schema reference wears
 * between `read` and `print`, while its final name is still up for grabs.
 */
export const pointerOf = (node: ts.Node): string | undefined => {
  if (!ts.isTypeReferenceNode(node)) return undefined

  const id = name(node)

  return id?.startsWith('#/') ? id : undefined
}

export const print = (nodes: readonly ts.Node[]): string => astToString([...nodes])

const children = (node: ts.Node): ts.Node[] => {
  const out: ts.Node[] = []
  ts.forEachChild(node, (child) => void out.push(child))
  return out
}

/** What a union and an intersection each reduce by, before anything structural is looked at. */
type Algebra = {
  /** Present alongside others, it adds nothing: `never` in a union, `unknown` in an intersection. */
  identity: ts.TypeNode
  /** Present at all, nothing else matters: `unknown` in a union, `never` in an intersection. */
  absorbing: ts.TypeNode
  build: (types: readonly ts.TypeNode[]) => ts.TypeNode
}

const Union: Algebra = { identity: NEVER, absorbing: UNKNOWN, build: f.createUnionTypeNode }

const Intersection: Algebra = { identity: UNKNOWN, absorbing: NEVER, build: f.createIntersectionTypeNode }

/**
 * Reduces by the algebra, then drops every member another member makes redundant, then rebuilds.
 *
 * `redundant(a, b)` says that keeping `a` makes `b` unnecessary. Where two members make each
 * other redundant the earlier one stays, so the result never empties out and never depends on
 * which member happened to be visited first.
 */
const fold = (
  types: readonly ts.TypeNode[],
  redundant: (a: ts.TypeNode, b: ts.TypeNode) => boolean,
  { identity, absorbing, build }: Algebra,
): ts.TypeNode => {
  if (types.some((type) => type.kind === absorbing.kind)) return absorbing

  const carrying = types.filter((type) => type.kind !== identity.kind)

  const kept = carrying.filter((type, i) =>
    carrying.every((other, j) => j === i || !redundant(other, type) || (redundant(type, other) && i < j)),
  )

  if (!kept.length) return identity
  if (kept.length === 1) return kept[0] ?? identity
  if (kept.length === types.length) return build(types)

  return build(kept)
}

/**
 * Types that mean the same thing with their parentheses taken off, wherever they sit —
 * the leftovers from a union that collapsed down to one member inside `(...)[]`. A union,
 * a function type or a `keyof` still needs its parentheses in some positions, so they keep them.
 */
const atomic = (node: ts.TypeNode): boolean =>
  ts.isTypeLiteralNode(node) ||
  ts.isTypeReferenceNode(node) ||
  ts.isArrayTypeNode(node) ||
  ts.isTupleTypeNode(node) ||
  ts.isLiteralTypeNode(node) ||
  ts.isToken(node)

const flip =
  (f: (a: ts.TypeNode, b: ts.TypeNode) => boolean) =>
  (a: ts.TypeNode, b: ts.TypeNode): boolean =>
    f(b, a)

/**
 * Whether `narrow` carries a member that satisfies `want`.
 *
 * A property `narrow` does not mention counts as unsatisfied even where `want` has it
 * optional: an object type is not exact, so a value of `{ a: string }` may carry a `b` of
 * any type at all, and `{ b?: number }` does not admit every one of those.
 */
const holds = (want: ts.TypeElement, narrow: ts.TypeLiteralNode): boolean => {
  if (!ts.isPropertySignature(want) || !want.type) return narrow.members.some((m) => text(m) === text(want))

  const found = narrow.members.find((m) => ts.isPropertySignature(m) && text(m.name) === text(want.name))

  if (!found || !ts.isPropertySignature(found) || !found.type) return false
  if (found.questionToken && !want.questionToken) return false

  return covers(want.type, found.type)
}

/** Whether a keyword type admits a literal: `string` admits `"a"`. */
const widens = (wide: ts.TypeNode, literal: ts.LiteralTypeNode['literal']): boolean => {
  if (wide.kind === ts.SyntaxKind.StringKeyword) return ts.isStringLiteral(literal)
  if (wide.kind === ts.SyntaxKind.NumberKeyword) return ts.isNumericLiteral(literal)
  if (wide.kind === ts.SyntaxKind.BooleanKeyword)
    return literal.kind === ts.SyntaxKind.TrueKeyword || literal.kind === ts.SyntaxKind.FalseKeyword

  return false
}

const keys = new WeakMap<ts.TypeNode, string>()

const canonical = (node: ts.TypeNode): string => {
  if (ts.isParenthesizedTypeNode(node)) return key(node.type)
  if (ts.isUnionTypeNode(node)) return `|(${sorted(node.types)})`
  if (ts.isIntersectionTypeNode(node)) return `&(${sorted(node.types)})`
  if (ts.isArrayTypeNode(node)) return `[${key(node.elementType)}]`
  if (ts.isTupleTypeNode(node)) return `(${node.elements.map(key).join(',')})`
  if (ts.isTypeLiteralNode(node)) return `{${[...node.members.map(entry)].sort().join(',')}}`
  if (ts.isTypeReferenceNode(node)) return `${text(node.typeName)}<${(node.typeArguments ?? []).map(key).join(',')}>`

  return text(node)
}

const sorted = (types: readonly ts.TypeNode[]) => [...types.map(key)].sort().join(',')

const entry = (node: ts.TypeElement): string =>
  ts.isPropertySignature(node) && node.type
    ? `${text(node.name)}${node.questionToken ? '?' : ''}:${key(node.type)}`
    : text(node)

/** Synthetic nodes have no source file of their own; the printer only needs somewhere to hang them. */
const blank = ts.createSourceFile('', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS)

const printer = ts.createPrinter({ omitTrailingSemicolon: true, removeComments: true })

const text = (node: ts.Node): string => printer.printNode(ts.EmitHint.Unspecified, node, blank)
