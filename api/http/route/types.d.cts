import { EncodingObject, ExampleObject, OperationObject } from 'openapi-typescript';
import { Schema } from '../../core/index.cjs';
export interface RouteSpec extends Omit<OperationObject, 'requestBody' | 'responses' | 'parameters'> {
    method?: undefined | 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';
    path?: undefined | string;
    body?: undefined | Schema.Type | BodyProtocol;
    query?: undefined | Schema.Type.Object;
    params?: undefined | Schema.Type.Object;
    response?: undefined | RouteSpecResponse;
}
export type RouteSpecResponse = Schema.Type.Object | {
    [status in number]: ResponseProtocol;
} | undefined;
export type RouteParamsSchemaFor<P extends string> = Schema.Type.Object<Record<ParametersOf<P>, any>>;
export type ParametersOf<P extends string, A = never> = P extends `:${infer N}/${infer R}` ? ParametersOf<R, A | N> : P extends `${string}:${infer N}/${infer R}` ? ParametersOf<R, A | N> : P extends `${string}:${infer N}` ? A | N : A;
/** A body by content type. A bare schema is shorthand for `{ 'application/json': schema }`. */
export interface BodyProtocol {
    'application/json'?: Schema.Type & EncodingObject;
    'application/octet-stream'?: EncodingObject;
}
type Parameter = {
    description?: string;
    required?: boolean;
    deprecated?: boolean;
    allowEmptyValue?: boolean;
    style?: string;
    explode?: boolean;
    allowReserved?: boolean;
    example?: any;
    examples?: {
        [name: string]: ExampleObject;
    };
};
export interface ResponseProtocol {
    'text/plain'?: Parameter;
    'text/html'?: Parameter;
    'application/json'?: Schema.Type.Object;
    'text/event-stream'?: Schema.Type;
    'application/octet-stream'?: Parameter;
}
export interface RequestParams<I extends RouteSpec> {
    body: RequestBody<I['body']>;
    query: I['query'] extends Schema.Type ? Schema.Output<I['query']> : undefined;
    path: I['params'] extends Schema.Type ? Schema.Output<I['params']> : RequestPathParams<I['path']>;
}
/** The body a handler receives: JSON by its schema, octet-stream as an `ArrayBuffer`. */
export type RequestBody<B> = B extends Schema.Type ? Schema.Output<B> : B extends BodyProtocol ? Schema.Output<JsonBody<B>> | ('application/octet-stream' extends keyof B ? ArrayBuffer : never) : undefined;
/** The JSON schema a body declares, if any. */
export type JsonBody<B> = B extends Schema.Type ? B : B extends {
    'application/json': infer S extends Schema.Type;
} ? S : undefined;
type RequestPathParams<P> = P extends string ? Record<ParametersOf<P>, string> : undefined;
export type ResponseTypes<T extends RouteSpec> = ResponseProtocolTypes<NormalizedRouteResponseSchema<T['response']>>;
/**
 * `{ [status]: { [contentType]: schema } }` from any of the three `response` shapes.
 *
 * Decided from keys alone: comparing a zod or TypeBox schema structurally against `ResponseProtocol`
 * walks every member of the schema, and this runs once per route.
 */
export type NormalizedRouteResponseSchema<T> = T extends object ? keyof T extends number ? T : keyof T extends keyof ResponseProtocol ? {
    200: T;
} : {
    200: {
        'application/json': T;
    };
} : {};
export interface ResponseProtocolTypes<T> {
    'text/plain': ResponseTypesFor<T, 'text/plain'>;
    'text/html': ResponseTypesFor<T, 'text/html'>;
    'application/json': ResponseTypesFor<T, 'application/json'>;
    'text/event-stream': ResponseTypesFor<T, 'text/event-stream'>;
    'application/octet-stream': ResponseTypesFor<T, 'application/octet-stream'>;
}
/** The statuses that declare content type `R`, each mapped to its schema for `R`. */
type ResponseTypesFor<T, R extends keyof ResponseProtocol> = {
    [K in keyof T as R extends keyof T[K] ? K : never]: T[K][R & keyof T[K]];
};
export type ReplyHandlers<T extends ResponseProtocolTypes<unknown>> = {
    sse: RepliesSse<T['text/event-stream']>;
    json: RepliesJson<T['application/json']>;
    text: RepliesText<T['text/plain']>;
    html: RepliesText<T['text/html']>;
    binary: RepliesBinary<T['application/octet-stream']>;
};
/** One signature rather than overloads, so a call resolves once. `S` is 200 unless `status` says otherwise. */
export type RepliesJson<T> = <S extends keyof T = 200 & keyof T>(data: NoInfer<Schema.Output<T[S]>>, status?: S | StatusResponseInit<S>) => Response;
export type RepliesText<T> = <S extends keyof T | 200 = 200>(data: TextBody, status?: S | StatusResponseInit<S>) => Response;
export type RepliesSse<T> = <S extends keyof T>(data: NoInfer<StreamData<Schema.Output<T[S]>>>, status: S | StatusResponseInit<S>) => Response;
export type RepliesBinary<T> = <S extends keyof T | 200 = 200>(data: BinaryBody, status?: S | StatusResponseInit<S>) => Response;
export type StatusResponseInit<S> = ResponseInit & {
    status: S;
};
export type BinaryBody = Blob | BufferSource | ReadableStream<Uint8Array>;
export type StreamData<T> = AsyncIterable<T> | (() => AsyncIterable<T>);
export type TextBody = string | BodyInit;
export type Compute<T> = {
    [K in keyof T]: T[K];
} & {};
export type Intersect<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
export {};
