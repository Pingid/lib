import { default as ts } from 'typescript';
import type * as oas from 'openapi-typescript';
declare const Methods: readonly ["get", "put", "post", "delete", "options", "head", "patch", "trace"];
declare const Locations: readonly ["path", "query", "header", "cookie"];
export type Method = (typeof Methods)[number];
/** Where a parameter travels. Each location becomes one object type on the emitted route. */
export type In = (typeof Locations)[number];
/** Matches a string exactly, by pattern, or by predicate. */
export type Pattern = string | RegExp | ((value: string) => boolean);
/** One parameter, lifted out of any `$ref`. */
export type Param = {
    in: In;
    name: string;
    required: boolean;
    type: ts.TypeNode;
    docs?: string;
    /** The parameter as written, `$ref` already followed. */
    source: oas.ParameterObject;
};
/** One request body variant, keyed by content type. */
export type Body = {
    media: string;
    required: boolean;
    type: ts.TypeNode;
    /** The media type's schema, `$ref` already followed. */
    schema?: oas.SchemaObject;
};
/** One response variant. `media` is `null` for statuses with no content. */
export type Reply = {
    status: string;
    media: string | null;
    type: ts.TypeNode;
    docs?: string;
    /** The media type's schema, `$ref` already followed. */
    schema?: oas.SchemaObject;
};
/**
 * One operation, lifted out of `paths[url][method]` so it can be reshaped on its own.
 *
 * `id` is the handle the pipeline uses to track a route across transforms — operators
 * rewrite `url`, `name` and `group` freely but must leave `id` alone.
 */
export type Route = {
    id: string;
    url: string;
    method: Method;
    /** Nesting of the emitted member. `[]` puts it at the top level. */
    group: string[];
    /** Member name within its group. Unset means "follow the url" — see `Route.name`. */
    name?: string;
    params: Param[];
    bodies: Body[];
    replies: Reply[];
    tags: string[];
    docs?: string;
    /** The operation as written, `$ref`s and all. `Route.*` is the resolved read. */
    source: oas.OperationObject;
};
/** How a declaration got into the model. */
export type Origin = 
/** A named schema in `components.schemas`. `name` is the key as the document spells it. */
{
    kind: 'schema';
    name: string;
}
/** Made by an operator. `at` is the place the type was lifted from, when it was lifted from one. */
 | {
    kind: 'made';
    at?: Site;
};
/**
 * One top-level declaration in the emitted file.
 *
 * `id` is the handle everything else points at: a type anywhere in the model can hold
 * `Decl.ref(id)`, and `print` swaps that placeholder for whatever name the declaration
 * ends up with. Names are suggestions — `print` makes them legal and unique — so nothing
 * downstream of a rename has to be told about it.
 */
export type Decl = {
    /** Any string beginning `#/`, unique within the model. */
    id: string;
    name: string;
    type: ts.TypeNode;
    /** `interface` where the type is an object literal; `type` otherwise. Defaults to `type`. */
    kind?: 'type' | 'interface';
    docs?: string;
    origin?: Origin;
};
/** A type's position in the model. Handed to every type rewrite, and recorded on lifted declarations. */
export type Site = {
    in: 'decl';
    decl: Decl;
} | {
    in: 'param';
    route: Route;
    param: Param;
} | {
    in: 'body';
    route: Route;
    body: Body;
} | {
    in: 'reply';
    route: Route;
    reply: Reply;
};
/** The whole editable surface. Every operator is an `Api -> Api`. */
export type Api = {
    routes: Route[];
    decls: Decl[];
};
export declare const Pattern: {
    /** `Pattern.match(/json/)('application/json')`. */
    match: (pattern: Pattern) => (value: string) => boolean;
};
/**
 * Reads over a route. Nothing these return is a `$ref`, which is the reason to
 * come through here rather than pick `source` apart by hand.
 */
export declare const Route: {
    /** Every HTTP method a path item can carry. */
    methods: readonly ["get", "put", "post", "delete", "options", "head", "patch", "trace"];
    /** Every place a parameter can travel. */
    locations: readonly ["path", "query", "header", "cookie"];
    /** The name the route is emitted under. Defaults to `METHOD /url`, so rewriting the url moves the member. */
    name: (route: Route) => string;
    /** Parameters, or just those in one location: `Route.params(route, 'query')`. */
    params: (route: Route, where?: In) => Param[];
    /** One parameter by name, whatever its location. */
    param: (route: Route, name: Pattern) => Param | undefined;
    /** The request body for a content type. Defaults to the first JSON one. */
    body: (route: Route, media?: Pattern) => Body | undefined;
    /** The response for a status. Defaults to the first success. */
    reply: (route: Route, status?: Pattern) => Reply | undefined;
    /** Replies grouped by status, in the order each status first appeared. */
    statuses: (route: Route) => [string, Reply[]][];
    /** Every type the route holds, in a flat list. */
    types: (route: Route) => ts.TypeNode[];
};
/** Reads and references over the declaration list. */
export declare const Decl: {
    /**
     * A placeholder reference to a declaration, by value or by id. `print` swaps it for the
     * name the declaration ends up with; a pointer with nothing behind it degrades to `unknown`.
     */
    ref: (decl: Decl | string) => ts.TypeReferenceNode;
    /** One declaration by id. */
    find: (api: Api, id: string) => Decl | undefined;
    /** The declarations that came from `components.schemas`, paired with the name the document gave them. */
    schemas: (api: Api) => (Decl & {
        origin: Extract<Origin, {
            kind: "schema";
        }>;
    })[];
    /** The declarations an operator made, rather than the document. */
    made: (api: Api) => Decl[];
    /** The id `Op.extract` gives a type lifted out of `at`. Deterministic, so re-running gives the same id. */
    at: (at: Site) => string;
    /** The description attached to whatever sits at `at`, when there is one. */
    docs: (at: Site) => string | undefined;
};
/** Narrows the OpenAPI unions, which otherwise only open up to an `in` check. */
export declare const Is: {
    ref: (value: unknown) => value is oas.ReferenceObject;
    object: (schema: oas.SchemaObject | undefined) => schema is oas.SchemaObject & oas.ObjectSubtype;
    array: (schema: oas.SchemaObject | undefined) => schema is oas.SchemaObject & oas.ArraySubtype;
    /** True when the schema admits `null`, however the document spells it. */
    nullable: (schema: oas.SchemaObject | undefined) => boolean;
};
/** Turns arbitrary strings into names TypeScript will accept. */
export declare const Name: {
    /** Strips a string down to a legal identifier: `Docker.Container` becomes `DockerContainer`. */
    identifier: (value: string) => string;
    /** `GET /api/docker/{id}` becomes `GetApiDockerId`. */
    pascal: (value: string) => string;
    /** `GET /api/docker/{id}` becomes `getApiDockerId`. */
    camel: (value: string) => string;
    /** `name` if it is free, else the first of `name_2`, `name_3`, ... that is. */
    free: (taken: Set<string>, name: string) => string;
};
/**
 * Applies `f` to every type in the model: declarations, parameters, bodies and replies.
 * `at` says which of those the type came from, so one rewrite can treat them differently.
 */
export declare const mapTypes: (api: Api, f: (type: ts.TypeNode, at: Site) => ts.TypeNode) => Api;
export {};
