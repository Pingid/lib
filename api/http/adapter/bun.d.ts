import * as Route from '../route/index.js';
interface BunRequest extends Request {
    readonly params: Record<string, string>;
}
export declare const bunRoutes: <const R extends Route.Route<any, any>[]>(routes: R) => Route.Compute<BunRoutes<R[number]["spec"]>>;
export type BunRoutes<R extends Route.RouteSpec> = {
    [K in R['path'] & string]: {
        [M in Extract<R, {
            path: K;
        }>['method'] & string]: (req: BunRequest) => Promise<Response>;
    };
};
export declare const bunRoute: <I extends Route.RouteSpec, C>(rt: Route.Route<I, C>) => Route.Route<I, any, BunRequest>;
export {};
