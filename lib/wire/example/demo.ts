/*--------------------------------------------------------------------------

@pingid/lib-wire

The MIT License (MIT)

Copyright (c) 2026 Dan Beaven <dm.beaven@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

---------------------------------------------------------------------------*/

import { pair } from '../src/node/index.ts'
import { Store } from '../src/protocols/records/index.ts'
import { Wire } from '../src/protocols/topics/index.ts'

/** `node example/demo.ts` */

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

const link = (a: { add: (n: never) => unknown }, b: { add: (n: never) => unknown }) => {
  const [x, y] = pair<unknown>()
  a.add(x as never)
  b.add(y as never)
}

// ------------------------------------------------------------------
// Topics — channels keyed by a name
// ------------------------------------------------------------------
type Chat = { tick: number; chat: string }
const chat = () => new Wire<Chat>({ name: 'chat', retain: ['tick'] })

const page = chat()
const worker = chat()
link(page, worker)
await settle()

page.topic('chat').listen((text, meta) => {
  console.log(`page   <- "${text}"`)
  if (meta.from) page.topic('chat').send('got it', meta.from)
})
worker.topic('chat').listen((text) => console.log(`worker <- "${text}"`))
await settle()

worker.topic('chat').send('anyone there?')
page.topic('tick').send(1)
await settle()

const late = chat()
link(page, late)
await settle()
late.topic('tick').listen((n, meta) => console.log(`late   <- tick ${n}${meta.retained ? ' (replayed)' : ''}`))
await settle()

// ------------------------------------------------------------------
// Records — keyed by (collection, id), same machinery
// ------------------------------------------------------------------
const store = () => new Store({ name: 'store' })

const server = store()
const writer = store()
const viewer = store()
const admin = store()
link(server, writer)
link(server, viewer)
link(server, admin)
await settle()

viewer.watch('users', '42', (patch) => console.log('viewer <- users/42', patch))
admin.watch('users', '*', (patch, at) => console.log(`admin  <- ${at.collection}/${at.id}`, patch))
await settle()

console.log('server is asked for:', server.watched())

writer.patch('users', '42', { name: 'ada' })
writer.patch('users', '7', { name: 'grace' })
writer.patch('posts', '1', { title: 'hi' })
await settle()

page.close()
worker.close()
late.close()
server.close()
writer.close()
viewer.close()
admin.close()
