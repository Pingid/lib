import { Type } from '@sinclair/typebox'
import { z } from 'zod'
import { expectTypeOf, it } from 'vitest'

import type { NormalizedRouteResponseSchema, ReplyHandlers, ResponseTypes, RouteSpecResponse } from './types.ts'

const Item = Type.Object({ id: Type.String() })
const Event = Type.Object({ tick: Type.Number() })
const Missing = Type.Object({ error: Type.String() })

type Replies<R extends RouteSpecResponse> = ReplyHandlers<ResponseTypes<{ response: R }>>

it('normalises a bare schema to a 200 JSON response', () => {
  expectTypeOf<NormalizedRouteResponseSchema<typeof Item>>().toEqualTypeOf<{
    200: { 'application/json': typeof Item }
  }>()
  const zItem = z.object({ id: z.string() })
  expectTypeOf<NormalizedRouteResponseSchema<typeof zItem>>().toEqualTypeOf<{
    200: { 'application/json': typeof zItem }
  }>()
})

it('normalises a content-type map to status 200 and keeps a status map', () => {
  type Protocols = { 'text/event-stream': typeof Event }
  expectTypeOf<NormalizedRouteResponseSchema<Protocols>>().toEqualTypeOf<{ 200: Protocols }>()
  type Statuses = { 200: { 'application/json': typeof Item }; 404: { 'application/json': typeof Missing } }
  expectTypeOf<NormalizedRouteResponseSchema<Statuses>>().toEqualTypeOf<Statuses>()
  expectTypeOf<NormalizedRouteResponseSchema<undefined>>().toEqualTypeOf<{}>()
})

it('groups schemas by content type, each status keeping only its own', () => {
  type T = ResponseTypes<{
    response: { 200: { 'application/json': typeof Item; 'text/event-stream': typeof Event }; 500: { 'text/plain': {} } }
  }>
  expectTypeOf<T['application/json']>().toEqualTypeOf<{ 200: typeof Item }>()
  expectTypeOf<T['text/event-stream']>().toEqualTypeOf<{ 200: typeof Event }>()
  expectTypeOf<keyof T['text/plain']>().toEqualTypeOf<500>()
  expectTypeOf<T['text/html']>().toEqualTypeOf<{}>()
})

it('types json data by the status passed, defaulting to 200', () => {
  void ((r: Replies<{ 200: { 'application/json': typeof Item }; 404: { 'application/json': typeof Missing } }>) => {
    r.json({ id: 'a' })
    r.json({ error: 'gone' }, 404)
    r.json({ error: 'gone' }, { status: 404, headers: {} })
    // @ts-expect-error 200 carries an Item
    r.json({ error: 'gone' })
    // @ts-expect-error 418 is not declared
    r.json({ id: 'a' }, 418)
  })
})

it('requires a declared status for sse, and allows text at 200', () => {
  void ((r: Replies<{ 201: { 'text/event-stream': typeof Event } }>) => {
    r.sse(async function* () {
      yield { tick: 1 }
    }, 201)
    // @ts-expect-error sse needs its status
    r.sse((async function* () {})())
    r.text('ok')
    r.text('ok', 200)
  })
})
