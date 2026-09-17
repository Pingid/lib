import { Result } from './schema.cjs';
import * as Schema from './schema.cjs';
/**
 * Reading a wire value into the type its JSON Schema fragment declares.
 *
 * Argv and a query string have the same problem — everything arrives as a string, and the
 * schema is the only thing that knows what it was meant to be. This lived on `Arg` first,
 * which is why the behaviour is spelled out in terms the command line cares about; the HTTP
 * layer needs exactly the same decisions, so it moved here rather than being written twice.
 *
 * `Schema.validate` would coerce for TypeBox on its own via `Value.Convert`, but not for a
 * standard schema, and a route's behaviour must not depend on which schema library its author
 * reached for. Coercing here, before validation, is what keeps the two dialects identical.
 */
/** Enumerated values, whether spelled as `enum` or as a union of `const` branches. */
export declare const choices: (json: Schema.Json) => unknown[] | undefined;
/**
 * One token to a typed value.
 *
 * The error side is the *expectation* — `a boolean`, `one of a, b` — not a full sentence, so
 * each caller can frame it for its own transport: `Arg` names the flag, the HTTP layer names
 * the input key.
 */
export declare const token: (json: Schema.Json, value: string) => Result<unknown, string>;
/**
 * Collected tokens to a value, never failing.
 *
 * A token that cannot be read is handed back as the string it was, so the *validator* reports
 * it. That keeps one issue format across both transports — a bad `?page=x` and a bad `--page x`
 * produce the same `Schema.Issue`, pathed by the input key — and it is why nothing here throws.
 *
 * An array soaks up every token; anything else takes the last, so a repeated flag and a repeated
 * query parameter agree on which one wins.
 */
export declare const tokens: (json: Schema.Json | undefined, values: string[]) => unknown;
