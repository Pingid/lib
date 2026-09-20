import { pair } from '../src/node.ts'
import { records } from '../src/protocols/records.ts'
import { topics } from '../src/protocols/topics.ts'

/** `node example/demo.ts` */

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

const link = (a: { add: (n: never) => unknown }, b: { add: (n: never) => unknown }) => {
  const [x, y] = pair<unknown>()
  a.add(x as never)
  b.add(y as never)
}

/* channels keyed by a name */

const chat = topics<{ tick: number; chat: string }>({ name: 'chat', retain: ['tick'] })
const page = chat.node()
const worker = chat.node()
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

const late = chat.node()
link(page, late)
await settle()
late.topic('tick').listen((n, meta) => console.log(`late   <- tick ${n}${meta.retained ? ' (replayed)' : ''}`))
await settle()

/* records keyed by (collection, id), same machinery */

const store = records('store')
const server = store.node()
const writer = store.node()
const viewer = store.node()
const admin = store.node()
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
