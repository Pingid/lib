import { Schema } from '../../../core/index.cjs';
import { ExtractorOptions } from './extract.cjs';
import { RouteSpec } from '../types.cjs';
export interface AdapterOptions<R = Request, S = Schema.Type, C = any> extends ExtractorOptions<R, S> {
    context?: C | ((req: R) => C);
}
export declare const contextFactory: <R extends Request, C = undefined, S extends Schema.Type = Schema.Type>(e: AdapterOptions<R, S, C>) => <I extends RouteSpec>(rt: I) => (req: R) => Promise<readonly [{
    readonly request: R;
    readonly params: {
        body: any;
        query: any;
        path: any;
    };
    readonly spec: I;
    readonly sse: import('../types.cjs').RepliesSse<{} | {
        [x: number]: (Schema.Type<unknown, unknown> & import('../types.cjs').Meta) | undefined;
    } | {} | {}>;
    readonly json: import('../types.cjs').RepliesJson<{} | {
        [x: number]: (Schema.Type.Object<Record<string, any>> & import('../types.cjs').Meta) | undefined;
    } | {
        200: Schema.Standard<Record<string, any>, Record<string, any>> & import('../types.cjs').Meta;
    } | {
        200: import('@sinclair/typebox').TObject<Record<string, any>> & import('../types.cjs').Meta;
    }>;
    readonly text: import('../types.cjs').RepliesText<{} | {
        [x: number]: import('../types.cjs').Meta | undefined;
    } | {} | {}>;
    readonly html: import('../types.cjs').RepliesText<{} | {
        [x: number]: import('../types.cjs').Meta | undefined;
    } | {} | {}>;
    readonly binary: import('../types.cjs').RepliesBinary<{} | {
        [x: number]: import('../types.cjs').Meta | undefined;
    } | {} | {}>;
}, C]>;
