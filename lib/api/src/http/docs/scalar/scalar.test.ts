import { Type } from '@sinclair/typebox'
import { describe, expect, it } from 'vitest'

import * as Route from '../../route/index.ts'
import { Scalar } from '../index.ts'
import { scalar } from './index.ts'

const getItem = Route.Spec('/items/:id', {
  method: 'GET',
  params: Type.Object({ id: Type.String() }),
  response: Type.Object({ id: Type.String() }),
})

/** The config object handed to `Scalar.createApiReference`. */
const configOf = (html: string) => JSON.parse(html.match(/createApiReference\('#app', (.*)\)<\/script>/)![1]!)

describe('scalar', () => {
  it('escapes the title and description', () => {
    const html = scalar({ title: 'A & <B>', description: 'Say "hi"\nMore' })
    expect(html).toContain('<title>A &amp; &lt;B&gt;</title>')
    expect(html).toContain('<meta name="description" content="Say &quot;hi&quot;" />')
  })

  it('omits the description meta when there is none', () => {
    const html = scalar({ title: 'A' })
    expect(html).not.toContain('name="description"')
    expect(html).not.toContain('undefined')
  })

  it('inlines config that cannot close its script tag', () => {
    const content = { info: { title: '</script><script>alert(1)</script>' } }
    const html = scalar({ title: 'A' }, { content })
    expect(html.match(/<\/script>/g)).toHaveLength(2)
    expect(configOf(html)).toEqual({ content })
  })

  it('keeps css and cdn out of the config', () => {
    const html = scalar({ title: 'A' }, { css: '.x{}', cdn: 'https://cdn.test/s.js', url: '/json' })
    expect(configOf(html)).toEqual({ url: '/json' })
    expect(html).toContain('<style>.x{}</style>')
    expect(html).toContain('<script src="https://cdn.test/s.js" crossorigin></script>')
  })

  it('drops the theme stylesheet when css is empty', () => {
    expect(scalar({ title: 'A' }, { css: '' }).match(/<style>/g)).toHaveLength(1)
  })
})

describe('Scalar', () => {
  const info = { title: 'Items', version: '1.0.0' }
  const get = (docs: { handler: (req: Request) => Promise<Response> }, path: string, method = 'GET') =>
    docs.handler(new Request(`http://x${path}`, { method }))

  it('points the page at the json route', async () => {
    const res = await get(Scalar('/docs', { info, routes: [getItem] }), '/docs')
    expect(res.headers.get('Content-Type')).toBe('text/html')
    expect(configOf(await res.text())).toEqual({ url: '/docs/json' })
  })

  it('embeds the document when asked', async () => {
    const docs = Scalar('/docs', { info, routes: [getItem], embed: true })
    expect(configOf(await (await get(docs, '/docs')).text())).toEqual({ content: docs.document })
  })

  it('lets scalar config override the url', async () => {
    const docs = Scalar('/docs', { info, routes: [getItem], scalar: { url: '/api/docs/json' } })
    expect(configOf(await (await get(docs, '/docs')).text()).url).toBe('/api/docs/json')
  })

  it('serves the document without the docs routes', async () => {
    const docs = Scalar('/docs', { info, routes: [getItem] })
    const doc = await (await get(docs, '/docs/json')).json()
    expect(doc.info).toEqual(info)
    expect(Object.keys(doc.paths)).toEqual(['/items/{id}'])
  })

  it('routes trailing slashes, and rejects other paths and methods', async () => {
    const docs = Scalar('/docs', { info, routes: [] })
    expect((await get(docs, '/docs/')).status).toBe(200)
    expect((await get(docs, '/docs/json/')).status).toBe(200)
    expect((await get(docs, '/other')).status).toBe(404)
    const post = await get(docs, '/docs', 'POST')
    expect(post.status).toBe(405)
    expect(post.headers.get('Allow')).toBe('GET, HEAD')
  })
})
