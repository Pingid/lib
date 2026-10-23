import { expect, it, vi } from 'vitest'

// Both are optional peers: a consumer without them must still be able to import the barrel.
vi.mock('hono', () => {
  throw new Error('the Http barrel imported hono')
})
vi.mock('elysia', () => {
  throw new Error('the Http barrel imported elysia')
})

it('imports without hono or elysia', async () => {
  const Http = await import('./index.ts')
  expect(Http.Route).toBeTypeOf('function')
  expect(Http.bunRoutes).toBeTypeOf('function')
  expect('honoRoutes' in Http || 'elysiaRoutes' in Http).toBe(false)
})

it('imports the package root without hono or elysia', async () => {
  const { Http } = await import('../index.ts')
  expect(Http.Route).toBeTypeOf('function')
})
