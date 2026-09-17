import { Elysia, AnyElysia } from 'elysia';
import { ComposeElysiaResponse, CreateEden, CreateEdenResponse, JoinPath, UnwrapRoute } from 'elysia/types';
import { AnyRoutable, Inputs, Intersect, Method, Responses, Routable, Spec } from './shared.cjs';
/**
 * Mount routes on an Elysia app, typed as if each went through `app.route`.
 *
 * Returns the app, so a group nests with `.use` or `.group`. Pass an app to set a prefix or decorators;
 * without `context`, the app must provide every route's context.
 *
 * @example
 * const app = new Elysia().decorate('db', db).use(elysiaRoutes([getItem], new Elysia({ prefix: '/api' })))
 * treaty<typeof app>('localhost').api.items({ id: '1' }).get()
 */
export declare const elysiaRoutes: {
    <const R extends readonly AnyRoutable[], A extends AnyElysia = Elysia>(routes: R & Provided<A, R>, app?: A): WithElysiaRoutes<A, R, ContextOf<A>>;
    <const R extends readonly AnyRoutable[], A extends AnyElysia, X = unknown>(routes: R, app: A, context: (ctx: X) => Needs<R>): WithElysiaRoutes<A, R, X>;
};
export type WithElysiaRoutes<A extends AnyElysia, R extends readonly AnyRoutable[], X> = Elysia<A['~Prefix'], A['~Singleton'], A['~Definitions'], A['~Metadata'], A['~Routes'] & Intersect<Eden<A['~Prefix'], R[number]['schema'], X>>, A['~Ephemeral'], A['~Volatile']>;
/** The route type `app.route` records for Eden. */
type Eden<B extends string, I, X> = I extends Spec ? CreateEden<JoinPath<B, I['path']>, {
    [M in Lowercase<Method<I>>]: CreateEdenResponse<I['path'], UnwrapRoute<Hook<I>, {}, JoinPath<B, I['path']>>, {}, ComposeElysiaResponse<UnwrapRoute<Hook<I>, {}, JoinPath<B, I['path']>>, ElysiaRouteArgs<I, X>[2], {}>>;
}> : never;
/** What the Elysia context carries: decorators, derives and resolves at the top, the store under `store`. */
type ContextOf<A extends AnyElysia> = A['~Singleton']['decorator'] & A['~Singleton']['derive'] & A['~Singleton']['resolve'] & {
    store: A['~Singleton']['store'];
};
type Needs<R extends readonly AnyRoutable[]> = Intersect<R[number] extends infer T ? (T extends {
    handler: (ctx: any, context: infer C) => unknown;
} ? C : never) : never>;
type Provided<A extends AnyElysia, R extends readonly AnyRoutable[]> = [ContextOf<A>] extends [Needs<R>] ? unknown : {
    error: 'The app does not provide the context these routes need';
    needs: Needs<R>;
};
/**
 * A route as the arguments `app.route` takes, so method and path come from the spec.
 *
 * The route validates its own input; Elysia gets its schemas for documentation only, so both frameworks
 * validate the same way. Context defaults to the Elysia context, so a route needing `{ db }` only mounts on an app
 * that decorates `db`. Pass `context` to derive it instead.
 *
 * @example
 * const app = new Elysia().decorate('db', db).route(...elysiaRoute(getItem))
 * treaty<typeof app>('localhost').items({ id: '1' }).get()
 */
export declare const elysiaRoute: {
    <const I extends Spec, C>(rt: Routable<I, C>): ElysiaRouteArgs<I, C>;
    <const I extends Spec, C, X = unknown>(rt: Routable<I, C>, context: (ctx: X) => C): ElysiaRouteArgs<I, X>;
};
export type ElysiaRouteArgs<I extends Spec, X> = readonly [
    method: Lowercase<Method<I>>,
    path: I['path'],
    handler: (ctx: X) => Promise<Responses<I>['data']>,
    hook: Hook<I>
];
/** The hook as Eden sees it: Elysia reads `~standard.types` off each part to type the route. */
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
