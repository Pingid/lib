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
    sse: import('../types.cjs').RepliesSse<{} | {} | {}>;
    json: import('../types.cjs').RepliesJson<{} | {
        200: import('@sinclair/typebox').TObject<Record<string, any>> & import('../types.cjs').Meta;
    } | {}>;
    text: import('../types.cjs').RepliesText<{} | {} | {}>;
    html: import('../types.cjs').RepliesText<{} | {} | {}>;
}>;
