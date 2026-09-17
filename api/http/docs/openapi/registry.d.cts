import { Schema } from '../../../core/index.cjs';
type Json = Schema.Json;
export interface RegistryOptions {
    /** Hoist schemas into `components.schemas`. `true` hoists object schemas; a predicate decides per schema. */
    refs?: boolean | ((schema: Json) => boolean);
    /** Structurally identical schemas share one component. Named models are referenced either way. */
    dedupe?: boolean;
}
/**
 * Collects component schemas and rewrites inline schemas into `$ref`s.
 *
 * A schema matching a named model becomes a `$ref` to it, even where it carries its own
 * `description` or other annotations, which then sit beside the `$ref`. Schemas carrying `$id`
 * or `title` always become components under that name. Others become components only when
 * given a fallback name and the `refs` predicate accepts them.
 */
export declare const createRegistry: ({ refs, dedupe }?: RegistryOptions, seed?: Record<string, Json>) => {
    schemas: Record<string, Schema.Json>;
    refer: (json: Json, name?: string) => Json;
    models: (record: Record<string, Json>) => void;
};
export declare const pascal: (s: string) => string;
export {};
