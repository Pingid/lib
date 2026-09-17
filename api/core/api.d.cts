import { Static, TObject, TUnknown, TSchema } from '@sinclair/typebox/type';
import * as Schema from './schema.cjs';
export interface Meta {
    [x: string]: unknown;
    name: string;
    description?: string;
}
/** Symbol key applied to types */
export declare const Tag: unique symbol;
export type Type<C extends Struct = any> = Group<C> | Method<any, any, C>;
export interface Group<in C extends Struct = {}> extends Meta {
    [Tag]: 'group';
    methods: (Method.Any | Group<C>)[];
}
export interface Method<in out I extends Struct = {}, out O extends any = undefined, in C extends Struct = {}> extends Method.Fields<I, O> {
    [Tag]: 'method';
    in: Schema.Type<I>;
    out: Schema.Type<O>;
    /** `O` is the resolved type — an async handler is the normal case over HTTP. */
    handle: (input: I, context: C) => O | Promise<O>;
}
export declare const isGroup: <T extends Type>(node: T) => node is T & Group;
export declare const group: <const O extends (Method.Any | Group<any>)[]>(spec: Meta & {
    methods: O;
}) => Group<Group.GroupContexts<O[number]>>;
export declare namespace Group {
    type GroupContexts<T> = Compute<Intersect<T extends Method<any, any, infer C> ? C : T extends Group<infer C> ? C : {}>>;
}
export declare const method: {
    <I extends TObject, O extends TSchema, C extends Struct = {}>(spec: Meta & {
        in: I;
        out?: O;
        handle: (input: Static<I>, context: C) => Static<O> | Promise<Static<O>>;
    }): Method<Static<I>, Static<O>, C>;
    <I extends TObject, O extends TSchema = TUnknown, C extends Struct = {}>(handle: (input: Static<I>, context: C) => Static<O> | Promise<Static<O>>, spec: Meta & {
        in: I;
        out?: O;
    }): Method<Static<I>, Static<O>, C>;
    <I extends Struct, O, C extends Struct = {}>(handle: (input: I, context: C) => O, spec: Method.Fields<I, O>): Method<I, O, C>;
};
export declare namespace Method {
    type Any = Method<any, any, any>;
    interface Fields<I extends Struct = {}, O extends any = undefined> extends Meta {
        in?: Schema.Type<I>;
        out?: Schema.Type<O>;
    }
}
export type Struct = Record<string, any>;
type Intersect<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
type Compute<T> = {
    [K in keyof T]: T[K];
} & {};
export {};
