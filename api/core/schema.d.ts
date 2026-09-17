import { StandardJSONSchemaV1, StandardSchemaV1 } from '@standard-schema/spec';
import { Static, TSchema as TTypeboxSchema } from '@sinclair/typebox/type';
export type Type<Output = unknown, Input = Output> = Standard<Input, Output> | TSchema;
export type Output<T extends Type> = T extends Standard<any, infer Output> ? Output : T extends TTypeboxSchema ? Static<T> : never;
/**
 * TypeBox's schema type, which does not carry its static type — so a `Schema<Output>`
 * built from one keeps `Output` while losing the concrete `TObject<{ ... }>`.
 *
 * That erasure is deliberate here (the union has to admit both schema dialects), but it
 * is invisible at the use site, so it is worth naming: an adapter that needs the schema
 * type back has to re-assert it from the static type, which is what `TypedSchema<O>` in
 * `http/schema.ts` does.
 */
type TSchema = TTypeboxSchema;
export declare const toJson: (schema: Type) => Json;
export declare const validate: <T = unknown>(input: T, schema?: Type) => Promise<Result<T, Issue[]>>;
/** The JSON Schema keywords these helpers read. The rest of a document is ignored. */
export interface Json {
    [key: string]: unknown;
    type?: string | string[];
    description?: string;
    default?: unknown;
    enum?: unknown[];
    items?: Json;
    properties?: Record<string, Json>;
    required?: string[];
    oneOf?: Json[];
    anyOf?: Json[];
}
export interface Issue {
    path: string;
    message: string;
}
interface Standard<I = unknown, O = I> extends StandardJSONSchemaV1<I, O> {
    readonly '~standard': StandardJSONSchemaV1.Props<I, O> & Partial<StandardSchemaV1.Props<I, O>>;
}
export type Result<T, E = unknown> = Result.Ok<T> | Result.Err<E>;
export declare namespace Result {
    type Ok<T> = {
        ok: true;
        value: T;
    };
    type Err<E> = {
        ok: false;
        error: E;
    };
}
export declare const Result: {
    ok: <T>(value: T) => Result.Ok<T>;
    err: <E>(error: E) => Result.Err<E>;
};
export {};
