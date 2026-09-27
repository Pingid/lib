import { Type } from '@sinclair/typebox'

import * as Route from '../route/index.ts'

export const Item = Type.Object({ id: Type.String(), name: Type.String(), stars: Type.Integer() })

export const getItem = Route.Route(
  {
    path: '/items/:id',
    method: 'GET',
    params: Type.Object({ id: Type.String() }),
    query: Type.Object({ bonus: Type.Optional(Type.Integer()) }),
    response: {
      200: { 'application/json': Item },
      404: { 'application/json': Type.Object({ error: Type.String() }) },
    },
  },
  (c) =>
    c.params.path.id === 'missing'
      ? c.json({ error: 'not found' }, 404)
      : c.json({ id: c.params.path.id, name: 'box', stars: 10 + (c.params.query.bonus ?? 0) }),
)

export const createItem = Route.Route('/items', {
  method: 'POST',
  body: Type.Object({ name: Type.String() }),
  response: { 201: { 'application/json': Item } },
  handle: (c) => c.json({ id: 'new', name: c.params.body.name, stars: 0 }, 201),
})

/** Needs `db` from the host framework's context. */
export const getStars = Route.Route('/stars', {
  response: Type.Object({ stars: Type.Integer() }),
  handle: (c, cx: { db: { stars: number } }) => c.json({ stars: cx.db.stars }),
})

export const getFile = Route.Route('/files/:id', {
  response: {
    200: { 'application/octet-stream': {} },
    404: { 'application/json': Type.Object({ error: Type.String() }) },
  },
  handle: (c) =>
    c.params.path.id === 'missing' ? c.json({ error: 'not found' }, 404) : c.binary(new Uint8Array([1, 2, 3])),
})

export const uploadFile = Route.Route('/files', {
  method: 'POST',
  body: { 'application/octet-stream': {} },
  response: { 201: { 'application/json': Type.Object({ size: Type.Integer() }) } },
  handle: (c) => c.json({ size: c.params.body.byteLength }, 201),
})
