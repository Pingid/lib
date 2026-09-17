import { default as ts } from 'typescript';
import { Route, Api } from './model.js';
/** How the routes are laid out. Shared by `Emit.routes` and `PrintOptions`. */
export type Shape = {
    /** Interface the routes are emitted into. Defaults to `Routes`. */
    root?: string;
    /** The type emitted for one route. Replace it to change the generated shape wholesale. */
    route?: (route: Route) => ts.TypeNode;
};
/**
 * The model as statements. Everything here takes a *bound* model — one that has been
 * through `bind`, so every reference is a real name rather than a pointer placeholder.
 * `print` binds for you; reach for these when replacing the file layout via `PrintOptions.emit`:
 *
 * ```ts
 * print(api, { emit: (api) => [...Emit.decls(api), Emit.routes(api, { root: 'Api' }), myOwnNode(api)] })
 * ```
 */
export declare const Emit: {
    /** Every declaration, as an `export type` or, where it asked for one, an `export interface`. */
    decls: (api: Api) => ts.Statement[];
    /** The routes, nested by group then name, as one interface. */
    routes: (api: Api, options?: Shape) => ts.Statement;
    /**
     * The default per-route type. Every field is always there, whether or not the route uses it,
     * so a client can read `p.request.query` without first asking whether this route has one:
     *
     * ```ts
     * {
     *   method: "POST";
     *   url: "/api/auth/admin/set-role";
     *   request: { body: {...}; params?: never; query?: Record<string, string>; headers?: Record<string, string> };
     *   response: { 200: SetUserRole };
     * }
     * ```
     */
    shape: (route: Route) => ts.TypeNode;
    /** The default file: the declarations, then the routes interface. */
    file: (api: Api, options?: Shape) => ts.Statement[];
    /**
     * What a route is called with: `body`, `params`, `query` and `headers`, always all four.
     *
     * A slot the document says nothing about falls back to whatever the emitted builder can
     * still do with it. Extra `query` entries are serialised and extra `headers` are spread, so
     * those stay open as `Record<string, string>`; a `params` entry the url has no placeholder
     * for and a `body` on a route that sends none would be dropped on the floor, so those close
     * to `never` rather than accepting a value that goes nowhere.
     */
    input: (route: Route) => ts.TypeNode;
    /** What a route answers with, keyed by status. Always present, empty for a route with no replies. */
    output: (route: Route) => ts.TypeNode;
    /**
     * Where each route's entry sits inside the root interface: group nesting, collision suffixes
     * and all. Every emitter goes through this, so the type of a route and the value built for it
     * are always reachable at the same key.
     */
    keys: (routes: Route[]) => Map<string, string[]>;
    /**
     * A `const` of request builders, one per route, under the same keys as the types. Each takes
     * the route's own request type — read off the emitted interface rather than spelled out again,
     * so the two cannot drift — and returns a plain object a `fetch` can take:
     *
     * ```ts
     * export const requests = {
     *   "PUT /api/db/container-config": (p: Routes["PUT /api/db/container-config"]["request"]) => ({
     *     method: "PUT",
     *     url: "/api/db/container-config",
     *     headers: { "Content-Type": "application/json" },
     *     body: JSON.stringify(p.body),
     *   }),
     * }
     * ```
     *
     * Statements rather than one, because a route with query parameters needs the helper that
     * builds the search string; it is emitted only when something uses it.
     */
    requests: (api: Api, options?: RequestOptions) => ts.Statement[];
    /** The default builder for one route: the function `Emit.requests` puts under each name. */
    request: (route: Route, options?: RequestOptions) => ts.Expression;
    /** The pointers left over with no declaration behind them. `print` reports these; they emit as `unknown`. */
    unresolved: (api: Api) => string[];
};
export type RequestOptions = {
    /** The const the builders are emitted into. Defaults to `requests`. */
    name?: string;
    /** The expression emitted for one route. Replace it to change the request shape wholesale. */
    request?: (route: Route) => ts.Expression;
    /**
     * Name for the helper that turns the `query` parameters into a search string. It is given a
     * free name and emitted alongside when a route needs it; `false` leaves the query out of the url.
     */
    search?: string | false;
    /** The interface the request types are read off. Defaults to `Routes`. */
    root?: string;
    /**
     * This route's key path inside that interface, so the builder can take
     * `Routes["GET /things"]["request"]` rather than spell the type out again.
     * `Emit.requests` fills it from `Emit.keys`; without it the type is inlined.
     */
    at?: string[];
};
/**
 * Settles every name and resolves every reference.
 *
 * Declarations name themselves whatever they like up to this point; here those names are
 * made legal and pulled apart where two collide, and the pointer placeholders left by `read`
 * and `Decl.ref` are pointed at the result. A pointer with no declaration behind it — dropped
 * by an op, or into a component kind the model does not name — degrades to `unknown` rather
 * than emitting a reference that will not compile.
 */
export declare const bind: (api: Api) => Api;
