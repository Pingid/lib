import { RegistryOptions } from './registry.js';
import { Schema } from '../../../core/index.js';
import type * as oa from 'openapi-typescript';
import type * as Route from '../../route/index.js';
export interface OpenApiConfig extends Partial<oa.OpenAPI3>, RegistryOptions {
    routes: (Route.Route<any, any> | Route.RouteSpec)[];
    /** Named schemas emitted as components. Matching inline schemas resolve to them when `dedupe` is on. */
    models?: Record<string, Schema.Type>;
    /** Defaults to the spec's `operationId`, else method + path, e.g. `GET /users/:id` → `getUsersById`. Repeats get a numeric suffix. */
    operationId?: (spec: Route.RouteSpec) => string;
    /** Component name for a hoisted body or response schema without its own `$id` or `title`. */
    name?: (ctx: NameContext) => string;
}
export interface NameContext {
    operationId: string;
    role: 'body' | 'response';
    status?: string;
    type?: string;
}
/**
 * Build an OpenAPI 3.2 document from routes.
 *
 * Object bodies and responses are hoisted into `components.schemas` and deduplicated by structure.
 *
 * @example
 * openapi({ info: { title: 'Items', version: '1.0.0' }, routes: [getItem], models: { Item } })
 */
export declare const resolve: (config: OpenApiConfig) => oa.OpenAPI3;
