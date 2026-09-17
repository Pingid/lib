import { expect, test } from 'vitest'

import { forwardPath, forwardUrl, normalizeUpstream, reversePath, reverseUrl } from './upstream.ts'

const u = normalizeUpstream({ origin: 'http://app:3000', stripPrefix: '/proxy/web' })
const based = normalizeUpstream({ origin: 'http://app:3000/base/', stripPrefix: '/proxy/web' })
const whole = normalizeUpstream('http://app:3000')

test('a path round-trips through the upstream and back', () => {
  expect(forwardPath(u, '/proxy/web/a/b')).toBe('/a/b')
  expect(reversePath(u, '/a/b')).toBe('/proxy/web/a/b')
})

test('an upstream base path is honoured in both directions', () => {
  expect(forwardPath(based, '/proxy/web/a')).toBe('/base/a')
  expect(reversePath(based, '/base/a')).toBe('/proxy/web/a')
  expect(reversePath(based, '/base')).toBe('/proxy/web/')
})

test('the bare mount point forwards as the upstream root', () => {
  expect(forwardPath(u, '/proxy/web')).toBe('/')
})

test('a trailing slash on the origin does not double up in the base path', () => {
  expect(based.basePath).toBe('/base')
  expect(whole.basePath).toBe('')
})

test('an absolute-path Location is pulled back under the prefix', () => {
  expect(reverseUrl(u, '/login')).toBe('/proxy/web/login')
  expect(reverseUrl(based, '/base/login')).toBe('/proxy/web/login')
})

test('an absolute Location on the upstream keeps its query and fragment', () => {
  expect(reverseUrl(u, 'http://app:3000/login?next=/a#f')).toBe('/proxy/web/login?next=/a#f')
})

test('an absolute-path Location keeps its query and fragment byte for byte', () => {
  expect(reverseUrl(u, '/a%20b?q=%2F#f')).toBe('/proxy/web/a%20b?q=%2F#f')
})

test('relative, protocol-relative and foreign targets are left alone', () => {
  expect(reverseUrl(u, 'login')).toBe('login')
  expect(reverseUrl(u, '//cdn.test/x')).toBe('//cdn.test/x')
  expect(reverseUrl(u, 'https://auth.test/x')).toBe('https://auth.test/x')
  expect(reverseUrl(u, '')).toBe('')
})

test('a referer pointing at the proxy is mapped onto the upstream', () => {
  const from = new URL('http://proxy.test/proxy/web/page')
  expect(forwardUrl(u, 'http://proxy.test/proxy/web/page?x=1', from)).toBe('http://app:3000/page?x=1')
})

test('a referer from another site is not ours to rewrite', () => {
  const from = new URL('http://proxy.test/proxy/web/page')
  expect(forwardUrl(u, 'https://elsewhere.test/x', from)).toBe(null)
  expect(forwardUrl(u, 'page', from)).toBe(null)
})

test('a referer outside the mount point is not ours either', () => {
  const from = new URL('http://proxy.test/proxy/web/page')
  expect(forwardUrl(u, 'http://proxy.test/elsewhere', from)).toBe(null)
})
