import { Result } from './schema.cjs';
import * as Schema from './schema.cjs';
/**
 * Reading a wire value into the type its JSON Schema fragment declares.
 *
 * Argv and a query string have the same problem: everything arrives as a string, and only the
 * schema knows what it was meant to be. `Schema.validate` converts for TypeBox but not for a
 * standard schema, and a route must not behave differently by schema library — so coercion
 * happens here, before validation, for both.
 *
 * @example
 * ```ts
 * tokens({ type: 'integer' }, ['5']) // 5
 * tokens({ type: 'array', items: { type: 'integer' } }, ['1', '2']) // [1, 2]
 * tokens({ type: 'integer' }, ['nope']) // 'nope' — the validator reports it
 * ```
 *
 * @module
 */
/** Enumerated values, whether spelled as `enum` or as a union of `const` branches. */
export declare const choices: (json: Schema.Json) => unknown[] | undefined;
/**
 * One token to a typed value. The error side is the *expectation*, not a sentence, so each
 * caller frames it for its own transport — `Arg` names the flag, HTTP names the input key.
 *
 * @example
 * ```ts
 * token({ type: 'boolean' }, 'yes') // { ok: true, value: true }
 * token({ enum: ['a', 'b'] }, 'c') // { ok: false, error: 'one of a, b' }
 * ```
 */
export declare const token: (json: Schema.Json, value: string) => Result<unknown, string>;
/**
 * Collected tokens to a value, never failing. An unreadable token is handed back as the string
 * it was, so the *validator* reports it and a bad `?page=x` and a bad `--page x` produce the
 * same `Schema.Issue`. An array soaks up every token; anything else takes the last.
 */
export declare const tokens: (json: Schema.Json | undefined, values: string[]) => unknown;
