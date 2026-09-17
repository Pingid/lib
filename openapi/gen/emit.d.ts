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
    /** The default per-route type: enough to drive a typed client with no further work. */
    shape: (route: Route) => ts.TypeNode;
    /** The default file: the declarations, then the routes interface. */
    file: (api: Api, options?: Shape) => ts.Statement[];
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
