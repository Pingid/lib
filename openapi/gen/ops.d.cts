import { default as ts } from 'typescript';
import { Decl, Pattern, Route, Api, Param, Reply, Site } from './model.cjs';
import * as Ast from './ast.cjs';
/** Every transform in the pipeline is one of these, so composing them is just function composition. */
export type Op = (api: Api) => Api;
/** Selects routes: a url matched exactly or by pattern, or any predicate over the route. */
export type Test = string | RegExp | ((route: Route) => boolean);
/**
 * The combinator vocabulary. Every member is or returns an `Op`, so a pipeline is
 * just a list of these handed to `generate` or `Op.pipe`.
 */
export declare const Op: {
    pipe: (...ops: Op[]) => Op;
    /**
     * Narrows the pipeline to the routes that match; the rest pass through untouched.
     *
     * Inner ops may drop or add routes, but must keep `id` intact — that is how results
     * are spliced back into their original positions.
     */
    where: (test: Test, ...ops: Op[]) => Op;
    /** Keeps the routes that match. */
    keep: (test: Test) => Op;
    /** Removes the routes that match. */
    drop: (test: Test) => Op;
    /** Rewrites the request url. */
    url: (f: (url: string, route: Route) => string) => Op;
    /** Pins the name the route is emitted under. Left alone it follows the url. */
    rename: (f: (name: string, route: Route) => string) => Op;
    /** Nests the emitted member under the returned segments. */
    group: (f: (route: Route) => string | string[]) => Op;
    /** Rewrites a route wholesale. Returning `null` drops it. */
    route: (f: (route: Route) => Route | null) => Op;
    /** Keeps the request and response bodies whose content type matches. Statuses with no content survive. */
    media: (test: Pattern) => Op;
    /** Keeps the responses whose status matches: `Op.status(/^2/)` leaves only the successes. */
    status: (test: Pattern) => Op;
    /** Rewrites parameters. Returning `null` drops one. */
    params: (f: (param: Param, route: Route) => Param | null) => Op;
    /** Rewrites responses. Returning `null` drops one. */
    replies: (f: (reply: Reply, route: Route) => Reply | null) => Op;
    /**
     * Rewrites every type in the model: declarations, parameters, bodies and replies.
     * `at` says where the type sits, for rewrites that only apply in one place.
     */
    types: (f: (type: ts.TypeNode, at: Site) => ts.TypeNode) => Op;
    /**
     * Collapses the matching members of every union and intersection in the model — the
     * shapes that pile up when one union is built from several responses that happen to agree.
     * Pass `{ subsume: true }` to also drop members another member already admits.
     *
     * Types are emitted as they stand when the op runs, so this goes after the `Op.declare`
     * that builds the union, not before.
     */
    collapse: (options?: Ast.CollapseOptions) => Op;
    /**
     * Adds top-level declarations, built from the model as it stands. A declaration whose
     * `id` is already in the model replaces it, so running the same op twice changes nothing.
     *
     * ```ts
     * // export interface Schemas { "Thing.Detail": ThingDetail; ... }
     * Op.declare((api) => ({
     *   id: '#/emit/Schemas',
     *   name: 'Schemas',
     *   kind: 'interface',
     *   type: Ast.obj(Decl.schemas(api).map((d) => ({ name: d.origin.name, type: Decl.ref(d) }))),
     * }))
     * ```
     */
    declare: (f: (api: Api) => Decl | Decl[] | null) => Op;
    /**
     * Hoists types out of the routes into their own declarations, leaving a reference behind.
     * Returning a name lifts the type; returning `null` leaves it where it is.
     *
     * ```ts
     * // export type GetThingsResponse = ...; then `200: GetThingsResponse` on the route
     * Op.extract((_type, at) =>
     *   at.in === 'reply' && at.reply.status.startsWith('2') ? `${Route.name(at.route)} Response` : null,
     * )
     * ```
     *
     * A type that is already a bare reference gets lifted too, giving an alias of an alias.
     * Check `Ast.pointerOf(type)` in the callback to leave those where they are.
     */
    extract: (f: (type: ts.TypeNode, at: Site) => string | null) => Op;
    /** Rewrites top-level declarations. Returning `null` drops one; references to it degrade to `unknown`. */
    decls: (f: (decl: Decl, api: Api) => Decl | null) => Op;
    /**
     * Renames the declarations that came from `components.schemas`; references follow
     * automatically. Returning `null` drops one.
     */
    schemas: (f: (decl: Decl) => string | null) => Op;
    /**
     * Drops parameters and bodies that carry nothing, then the schemas nothing references.
     * Declarations an operator made are kept whether or not anything reaches them — they are
     * there because the pipeline asked for them. An `Op` already.
     */
    compact: (api: Api) => Api;
    /** Orders routes and declarations by emitted name, so regenerating gives a clean diff. An `Op` already. */
    sort: (api: Api) => Api;
    /** The operation's first tag, ready for `Op.group(Op.byTag)`. */
    byTag: (route: Route) => string[];
};
