import { Inputs, Method, Responses, Routable, Spec } from './shared.js';
/**
 * A route as the arguments `app.route` takes, so method and path come from the spec.
 *
 * The route validates its own input, so Elysia gets no runtime schemas: the hook only carries types
 * for Eden. Context defaults to the Elysia context, so a route needing `{ db }` only mounts on an app
 * that decorates `db`. Pass `context` to derive it instead.
 *
 * @example
 * const app = new Elysia().decorate('db', db).route(...elysiaRoute(getContainer))
 * treaty<typeof app>('localhost').containers({ id: '1' }).get()
 */
export declare const elysiaRoute: {
    <const I extends Spec, C>(rt: Routable<I, C>): Args<I, C>;
    <const I extends Spec, C, X = unknown>(rt: Routable<I, C>, context: (ctx: X) => C): Args<I, X>;
};
export type Args<I extends Spec, X> = readonly [
    method: Lowercase<Method<I>>,
    path: I['path'],
    handler: (ctx: X) => Promise<Responses<I>['data']>,
    hook: Hook<I>
];
/** Type-only schemas: Elysia reads `~standard.types` to type the route for Eden. */
export type Hook<I extends Spec> = {
    [K in keyof Inputs<I>]: Typed<Inputs<I>[K]>;
} & ([Responses<I>] extends [never] ? {} : {
    response: {
        [S in Responses<I>['status'] & number]: Typed<Extract<Responses<I>, {
            status: S;
        }>['data']>;
    };
});
/** Structural rather than Elysia's `StandardSchemaV1Like`, which is invariant in its type parameters. */
type Typed<T> = {
    readonly '~standard': {
        readonly types: {
            readonly input: T;
            readonly output: T;
        };
    };
};
export {};
