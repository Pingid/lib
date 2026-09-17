import { OperationObject } from 'openapi-typescript';
import { Schema } from '../../core/index.cjs';
export interface Meta {
    tags?: string[];
    summary?: string;
    description?: string;
    operationId?: string;
    models?: Schema.Type.Object[];
}
export interface RouteSpec extends Omit<OperationObject, 'requestBody' | 'responses' | 'parameters'> {
    method?: undefined | 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';
    path?: undefined | string;
    body?: undefined | Schema.Type;
    query?: undefined | Schema.Type.Object;
    params?: undefined | Schema.Type.Object;
    response?: undefined | RouteSpecResponse;
}
export type RouteSpecResponse = (Schema.Type.Object & Meta) | {
    [status in number]: ResponseProtocol;
} | undefined;
export type RouteParamsSchemaFor<P extends string> = Schema.Type.Object<Record<ParametersOf<P>, any>>;
export type ParametersOf<P extends string, A = never> = P extends `:${infer N}/${infer R}` ? ParametersOf<R, A | N> : P extends `${string}:${infer N}/${infer R}` ? ParametersOf<R, A | N> : P extends `${string}:${infer N}` ? A | N : A;
export interface ResponseProtocol {
    'text/plain'?: Meta;
    'text/html'?: Meta;
    'application/json'?: Schema.Type.Object & Meta;
    'text/event-stream'?: Schema.Type & Meta;
}
export interface RequestParams<I extends RouteSpec> {
    body: I['body'] extends undefined ? undefined : Schema.Output<I['body']>;
    query: I['query'] extends undefined ? undefined : Schema.Output<I['query']>;
    path: Schema.Output<I['params']> extends undefined ? RequestPathParams<I['path']> : Schema.Output<I['params']>;
}
type RequestPathParams<P> = P extends string ? Record<ParametersOf<P>, string> : undefined;
export type ResponseTypes<T extends RouteSpec> = ResponseProtocolTypes<NormalizedRouteResponseSchema<T['response']>>;
export type NormalizedRouteResponseSchema<T> = T extends ResponseProtocol ? {
    200: T;
} : T extends Record<any, ResponseProtocol> ? T extends Schema.Type.Object ? {
    200: {
        'application/json': T;
    };
} : T : {};
export interface ResponseProtocolTypes<T extends Record<number, ResponseProtocol>> {
    'text/plain': ResponseTypesFor<T, 'text/plain'>;
    'text/html': ResponseTypesFor<T, 'text/html'>;
    'application/json': ResponseTypesFor<T, 'application/json'>;
    'text/event-stream': ResponseTypesFor<T, 'text/event-stream'>;
}
type ResponseTypesFor<T extends Record<number, ResponseProtocol>, R extends keyof ResponseProtocol> = {
    [K in keyof T as T[K] extends {
        [key in R]: any;
    } ? K : never]: T[K][keyof T[K]];
};
export type ReplyHandlers<T extends ResponseTypes<any>> = {
    sse: RepliesSse<T['text/event-stream']>;
    json: RepliesJson<T['application/json']>;
    text: RepliesText<T['text/plain']>;
    html: RepliesText<T['text/html']>;
};
export type RepliesJson<T extends Record<number, any>> = {
    (data: Schema.Output<T[200]>, status?: 200 | StatusResponseInit<200>): Response;
    <S extends keyof T>(data: Schema.Output<T[S]>, status: S | StatusResponseInit<S>): Response;
};
export type RepliesText<T extends Record<number, any>> = {
    (data: TextBody, status?: 200 | StatusResponseInit<200>): Response;
    <S extends keyof T>(data: TextBody, status: S | StatusResponseInit<S>): Response;
};
export type RepliesSse<T extends Record<number, Schema.Type>> = {
    <S extends keyof T>(data: StreamData<Schema.Output<T[S]>>, status: S | StatusResponseInit<S>): Response;
};
export type StatusResponseInit<S> = ResponseInit & {
    status: S;
};
export type StreamData<T> = AsyncIterable<T> | (() => AsyncIterable<T>);
export type TextBody = string | BodyInit;
export type Compute<T> = {
    [K in keyof T]: T[K];
} & {};
export {};
