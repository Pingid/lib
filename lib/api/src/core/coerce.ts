import * as Schema from './schema.ts'
import { Result } from './schema.ts'
import { format } from './text.ts'

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
export const choices = (json: Schema.Json): unknown[] | undefined => {
  if (json.enum) return json.enum

  const branches = json.oneOf ?? json.anyOf
  if (!branches || branches.length === 0 || !branches.every((branch) => 'const' in branch)) return undefined

  return branches.map((branch) => branch['const'])
}

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
export const token = (json: Schema.Json, value: string): Result<unknown, string> => {
  const options = choices(json)
  if (options) {
    const index = options.findIndex((option) => String(option) === value)
    if (index === -1) return Result.err(`one of ${options.map(format).join(', ')}`)
    return Result.ok(options[index])
  }

  const type = Array.isArray(json.type) ? json.type.find((entry) => entry !== 'null') : json.type

  switch (type) {
    case 'boolean': {
      if (value === 'true' || value === '1' || value === 'yes') return Result.ok(true)
      if (value === 'false' || value === '0' || value === 'no') return Result.ok(false)
      return Result.err('a boolean')
    }

    case 'integer':
    case 'number': {
      const parsed = Number(value)
      if (value.trim() === '' || !Number.isFinite(parsed)) return Result.err('a number')
      if (type === 'integer' && !Number.isInteger(parsed)) return Result.err('an integer')
      return Result.ok(parsed)
    }

    case 'array':
    case 'object': {
      try {
        return Result.ok(JSON.parse(value))
      } catch {
        return Result.err('valid JSON')
      }
    }

    case 'string':
      return Result.ok(value)

    default: {
      // An untyped fragment passes the token through; a union tries each branch in turn.
      const branches = json.oneOf ?? json.anyOf
      if (!branches) return Result.ok(value)

      for (const branch of branches) {
        const result = token(branch, value)
        if (result.ok) return result
      }

      return Result.err('a supported value')
    }
  }
}

/**
 * Collected tokens to a value, never failing. An unreadable token is handed back as the string
 * it was, so the *validator* reports it and a bad `?page=x` and a bad `--page x` produce the
 * same `Schema.Issue`. An array soaks up every token; anything else takes the last.
 */
export const tokens = (json: Schema.Json | undefined, values: string[]): unknown => {
  const last = values[values.length - 1]
  if (json === undefined) return last

  const type = Array.isArray(json.type) ? json.type.find((entry) => entry !== 'null') : json.type
  if (type === 'array') return values.map((value) => keep(json.items ?? {}, value))

  return last === undefined ? undefined : keep(json, last)
}

const keep = (json: Schema.Json, value: string): unknown => {
  const result = token(json, value)
  return result.ok ? result.value : value
}
