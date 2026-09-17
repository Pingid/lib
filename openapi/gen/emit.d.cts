import { default as ts } from 'typescript';
import { Route, Api } from './model.cjs';
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
    /** The default per-route type: enough to drive a typed client with no further work. */
    shape: (route: Route) => ts.TypeNode;
    /** The default file: the declarations, then the routes interface. */
    file: (api: Api, options?: Shape) => ts.Statement[];
    /**
     * What a route is called with: its parameters by location, and its body. `undefined` for a
     * route that takes neither, so the builder emitted for it takes no argument.
     */
    input: (route: Route) => ts.TypeNode | undefined;
    /**
     * A `const` of request builders, one per route, nested the same way `Emit.routes` nests
     * the types. Each is a function from the route's input to a plain object a `fetch` can take:
     *
     * ```ts
     * export const requests = {
     *   "POST /api/things/{id}": (p: { path: { id: string }; body: Thing }) => ({
     *     method: "POST",
     *     url: `/api/things/${p.path.id}`,
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
