import { Schema } from '../../../core/index.js';
import { ExtractorOptions } from './extract.js';
import { RouteSpec } from '../types.js';
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
    sse: import('../types.js').RepliesSse<{} | {} | {}>;
    json: import('../types.js').RepliesJson<{} | {
        200: import('@sinclair/typebox').TObject<Record<string, any>> & import('../types.js').Meta;
    } | {}>;
    text: import('../types.js').RepliesText<{} | {} | {}>;
    html: import('../types.js').RepliesText<{} | {} | {}>;
}>;
