import { Schema } from '../../../core/index.js';
import { ExtractorOptions } from './extract.js';
import { RouteSpec } from '../types.js';
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
    readonly sse: import('../types.js').RepliesSse<{} | {
        [x: number]: Schema.Type<unknown, unknown> | undefined;
    } | {} | {}>;
    readonly json: import('../types.js').RepliesJson<{} | {
        [x: number]: Schema.Type.Object<Record<string, any>> | undefined;
    } | {
        200: Schema.Standard<Record<string, any>, Record<string, any>>;
    } | {
        200: import('@sinclair/typebox').TObject<Record<string, any>>;
    }>;
    readonly text: import('../types.js').RepliesText<{} | {
        [x: number]: {
            description?: string;
            required?: boolean;
            deprecated?: boolean;
            allowEmptyValue?: boolean;
            style?: string;
            explode?: boolean;
            allowReserved?: boolean;
            example?: any;
            examples?: {
                [name: string]: import('openapi-typescript').ExampleObject;
            };
        } | undefined;
    } | {} | {}>;
    readonly html: import('../types.js').RepliesText<{} | {
        [x: number]: {
            description?: string;
            required?: boolean;
            deprecated?: boolean;
            allowEmptyValue?: boolean;
            style?: string;
            explode?: boolean;
            allowReserved?: boolean;
            example?: any;
            examples?: {
                [name: string]: import('openapi-typescript').ExampleObject;
            };
        } | undefined;
    } | {} | {}>;
    readonly binary: import('../types.js').RepliesBinary<{} | {
        [x: number]: {
            description?: string;
            required?: boolean;
            deprecated?: boolean;
            allowEmptyValue?: boolean;
            style?: string;
            explode?: boolean;
            allowReserved?: boolean;
            example?: any;
            examples?: {
                [name: string]: import('openapi-typescript').ExampleObject;
            };
        } | undefined;
    } | {} | {}>;
}, C]>;
