import { Schema } from '../../../core/index.cjs';
import { ExtractorOptions } from './extract.cjs';
import { RouteSpec } from '../types.cjs';
export interface AdapterOptions<R = Request, S = Schema.Type, C = any> extends ExtractorOptions<R, S> {
    context?: C | ((req: R) => C);
}
export declare const contextFactory: <R extends Request, C = undefined, S extends Schema.Type = Schema.Type>(e: AdapterOptions<R, S, C>) => <I extends RouteSpec>(rt: I) => (req: R) => Promise<{
    request: R;
    params: {
        body: any;
        query: any;
        path: any;
    };
    spec: I;
    context: any;
    sse: import('../types.cjs').RepliesSse<{} | {
        [x: number]: (Schema.Type<unknown, unknown> & import('../types.cjs').Meta) | undefined;
    } | {} | {}>;
    json: import('../types.cjs').RepliesJson<{} | {
        [x: number]: (Schema.Type.Object<Record<string, any>> & import('../types.cjs').Meta) | undefined;
    } | {
        200: Schema.Standard<Record<string, any>, Record<string, any>> & import('../types.cjs').Meta;
    } | {
        200: import('@sinclair/typebox').TObject<Record<string, any>> & import('../types.cjs').Meta;
    }>;
    text: import('../types.cjs').RepliesText<{} | {
        [x: number]: import('../types.cjs').Meta | undefined;
    } | {} | {}>;
    html: import('../types.cjs').RepliesText<{} | {
        [x: number]: import('../types.cjs').Meta | undefined;
    } | {} | {}>;
}>;
