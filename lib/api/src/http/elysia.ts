// import type { TSchema as ElysiaTSchema } from 'elysia'

// import { tokens } from '../core/coerce.ts'
// import { Schema } from '../core/index.ts'
// import { HttpError } from './error.ts'
// import * as Input from './input.ts'
// import type * as Route from './route.ts'
// import * as Split from './split.ts'
// import type { Compute, Struct } from './util.ts'

// /**
//  * A schema carrying its static type — the only way to tell Eden what a route accepts and
//  * returns, since `Schema.Type` erases the schema type on the way in.
//  *
//  * Built on **elysia's** `TSchema`, not ours: `@sinclair/typebox` ships two declaration builds
//  * behind conditional exports, each with its own `unique symbol` `Kind`, and under `nodenext`
//  * elysia's CJS `.d.ts` reads one while this ESM package reads the other. Even a plain
//  * `Type.Object(…)` from here is not assignable to elysia's `AnySchema`, which is why this
//  * module imports no typebox at all.
//  */
// export interface TypedSchema<O> extends ElysiaTSchema {
//   type: 'object'
//   static: O
// }

// /**
//  * The request parts this route actually uses. An unbound source has to be dropped: elysia
//  * types an unvalidated `body` as `unknown`, which is not assignable to the `{}` an empty
//  * `Pick` gives, so declaring every part would fail every GET.
//  */
// export type Parts<I, S> = Route.Present<{
//   params: Route.Part<I, S, 'path'>
//   query: Route.Part<I, S, 'query'>
//   headers: Route.Part<I, S, 'header'>
//   body: Route.Part<I, S, 'body'>
// }>

// export type Hooks<I, S, O> = Compute<
//   { [K in keyof Parts<I, S>]: TypedSchema<Parts<I, S>[K]> } & { response: { 200: TypedSchema<O> } }
// >

// /**
//  * Only what the handler reads. A handler parameter is contravariant, so elysia's much fatter
//  * `Context` is assignable to it — and naming `D` here is what reports a missing `.decorate`
//  * at the `.get()` call, against the app that would have to supply it.
//  */
// export type Ctx<I, S, D extends Struct> = Compute<Parts<I, S> & D & { set: { status?: number | string } }>

// /** Exactly the arguments `get` takes, so `app.get(...elysia(r))` is an ordinary call. */
// export type Args<P extends string, I, S, O, D extends Struct> = readonly [
//   path: P,
//   handler: (context: Ctx<I, S, D>) => Promise<O>,
//   hooks: Hooks<I, S, O>,
// ]

// /**
//  * One route as the three arguments elysia's `.get`/`.post`/… already take.
//  *
//  * Spread rather than wrapped, because elysia builds the `Routes` type Eden reads out of
//  * exactly those argument types. The return must stay a *tuple*; as an array every literal is
//  * lost at once.
//  *
//  * @example
//  * ```ts
//  * import { Elysia as App } from 'elysia'
//  * import * as Elysia from '@pingid/lib-api/http/elysia'
//  *
//  * const app = new App().decorate('db', db).get(...Elysia.route(get))
//  * treaty<typeof app>('localhost').orgs({ org: 'a' }).get({ query: { page: 2 } })
//  * ```
//  */
// export const route = <I extends Struct, O, C extends Struct, P extends string, D extends Struct, S>(
//   route: Route.Type<I, O, C, P, D, S>,
// ): Args<P, I, S, O, D> => {
//   const node = route as unknown as Route.Node
//   const parts = Split.of(node.node.in, node.bindings)

//   const hooks: Struct = {}
//   if (parts.params) hooks['params'] = parts.params
//   if (parts.query) hooks['query'] = parts.query
//   if (parts.headers) hooks['headers'] = parts.headers
//   if (parts.body) hooks['body'] = parts.body
//   if (node.node.out) hooks['response'] = { 200: node.node.out }

//   // Elysia validates the parts before the handler, and does not coerce `?page=5` into an
//   // integer on its own. `transform` runs first, so the same fragment-driven coercer the CLI
//   // and the fetch adapter use decides the value here too, and elysia then checks a typed one.
//   hooks['transform'] = (ctx: Struct) => coerce(node, ctx)

//   /** True when elysia was given nothing to validate — a standard schema, or a non-object root. */
//   const ours =
//     node.node.in !== undefined &&
//     parts.params === undefined &&
//     parts.query === undefined &&
//     parts.headers === undefined &&
//     parts.body === undefined

//   const handler = async (ctx: Struct) => {
//     const request = ctx['request'] as Request | undefined

//     try {
//       let input: Struct

//       if (ours && request) {
//         input = await Input.assemble(node, request)
//         const validated = await Schema.validate(input, node.node.in)
//         if (!validated.ok) throw HttpError.fromIssues(validated.error)
//         input = validated.value as Struct
//       } else {
//         // Elysia decoded and checked the parts already; reading them back avoids doing it twice.
//         input = Input.flatten(
//           node,
//           {
//             path: ctx['params'],
//             query: ctx['query'],
//             header: ctx['headers'],
//             cookie: ctx['cookie'],
//             body: ctx['body'],
//           },
//           request,
//         )
//       }

//       const handle = node.node.handle
//       if (!handle) throw new HttpError(`Route '${node.node.name}' has no handler`, { status: 501 })

//       return await handle(input, await resolve(node, ctx))
//     } catch (error) {
//       if (!(error instanceof HttpError)) throw error

//       // Report through elysia's own response, so `.onError` and its serialisation still apply.
//       const set = ctx['set'] as { status?: number } | undefined
//       if (set) set.status = error.status
//       return error.body
//     }
//   }

//   return [node.path, handler, hooks] as unknown as Args<P, I, S, O, D>
// }

// /** Coerce in place: the parts are elysia's own objects, and it validates them next. */
// const coerce = (route: Route.Node, ctx: Struct) => {
//   const parts: Partial<Record<Route.Source, string>> = {
//     path: 'params',
//     query: 'query',
//     header: 'headers',
//     cookie: 'cookie',
//   }

//   for (const [key, binding] of Object.entries(route.bindings)) {
//     const slot = parts[binding.source]
//     if (slot === undefined) continue

//     const part = ctx[slot] as Struct | undefined
//     const raw = part?.[binding.name]
//     if (raw === undefined) continue

//     const values = Array.isArray(raw) ? raw : [raw]
//     if (!values.every((value) => typeof value === 'string')) continue

//     part![binding.name] = tokens(route.fragment(key), values as string[])
//   }
// }

// const resolve = async (route: Route.Node, framework: Struct): Promise<Struct> => ({
//   ...route.context,
//   ...(route.supply ? await route.supply(framework) : framework),
// })
