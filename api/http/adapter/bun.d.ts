import * as Route from '../route/index.js';
interface BunRequest extends Request {
    readonly params: Record<string, string>;
}
export declare const routes: <const R extends Route.Route<any, any>[]>(routes: R) => Route.Compute<Routes<R[number]["schema"]>>;
export type Routes<R extends Route.RouteSpec> = {
    [K in R['path'] & string]: {
        [M in Extract<R, {
            path: K;
        }>['method'] & string]: (req: BunRequest) => Promise<Response>;
    };
};
export declare const adapt: <I extends Route.RouteSpec, C>(rt: Route.Route<I, C>) => Route.Route<I, any, BunRequest>;
export {};
