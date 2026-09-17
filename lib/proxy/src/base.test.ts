import { expect, test } from 'vitest'

import { RequestPolicy, rebuildRequest } from './request.ts'
import { SetCookie, SetCookiePolicy } from './cookie.ts'
import { HeaderPolicy } from './header.ts'

test('steps run in the order they were appended', () => {
  const out = HeaderPolicy.create().set('x', 'first').set('x', 'second').copyOf({})
  expect(out.get('x')).toBe('second')
})

test('use splices another policy in at the point it was spliced', () => {
  const inner = HeaderPolicy.create().set('x', 'inner')
  const out = HeaderPolicy.create().set('x', 'before').use(inner).set('y', 'after').copyOf({})
  expect(out.get('x')).toBe('inner')
  expect(out.get('y')).toBe('after')
})

test('use snapshots the policy as it stands, not as it later becomes', () => {
  const inner = HeaderPolicy.create().set('x', 'one')
  const outer = HeaderPolicy.create().use(inner)
  inner.set('x', 'two')
  expect(outer.copyOf({}).get('x')).toBe('one')
})

test('when(false) adds nothing at all', () => {
  const out = HeaderPolicy.create()
    .when(false, (p) => p.set('x', '1'))
    .when(true, (p) => p.set('y', '2'))
    .copyOf({})
  expect(out.has('x')).toBe(false)
  expect(out.get('y')).toBe('2')
})

test('a null from one step skips every step after it', () => {
  let reached = false
  const policy = SetCookiePolicy.create()
    .drop(() => true)
    .map((cookie) => {
      reached = true
      return cookie
    })
  expect(policy.applyTo(SetCookie.parse('a=1'))).toBe(null)
  expect(reached).toBe(false)
})

test('a step reads the context it was applied with', () => {
  const policy = HeaderPolicy.create().filter((name) => name !== 'drop')
  const out = HeaderPolicy.create()
    .use(policy)
    .mapSetCookie((cookie, context) => {
      cookie.value = String(context['tenant'])
      return cookie
    })
    .copyOf(new Headers({ 'set-cookie': 'a=1', drop: '1' }), { tenant: 'acme' })
  expect(out.getSetCookie()).toEqual(['a=acme'])
  expect(out.has('drop')).toBe(false)
})

test('applying with no context does not carry writes into the next application', () => {
  const policy = HeaderPolicy.create().filter((_name, _value) => true)
  const first = policy.copyOf({})
  const second = policy.copyOf({})
  expect(first).not.toBe(second)
})

test('two overlapping applications never see each others context', async () => {
  // A policy is shared and every step awaits, so anything stashed on the policy
  // itself would interleave. This is the test that keeps that from coming back.
  const policy = RequestPolicy.create().map(async (request, context) => {
    await new Promise((resolve) => setTimeout(resolve, 0))
    return rebuildRequest(request, { headers: { 'x-tenant': String(context['tenant']) } })
  })

  const [a, b] = await Promise.all([
    policy.applyTo(new Request('http://a.test/'), { tenant: 'a' }),
    policy.applyTo(new Request('http://b.test/'), { tenant: 'b' }),
  ])

  expect(a.headers.get('x-tenant')).toBe('a')
  expect(b.headers.get('x-tenant')).toBe('b')
})

test('a policy built once applies many times without accumulating', async () => {
  const policy = RequestPolicy.create().method((m) => m.toUpperCase())
  const first = await policy.applyTo(new Request('http://a.test/', { method: 'post' }))
  const second = await policy.applyTo(new Request('http://a.test/', { method: 'post' }))
  expect(first.method).toBe('POST')
  expect(second.method).toBe('POST')
})
