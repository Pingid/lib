import { expect, test } from 'vitest'

import { Stack, Context, Resource } from '../src/index.ts'
import type { Spec } from '../src/index.ts'

/** Resources reached only through `use()` are in the output but not in the type — see README. */
const whole = (spec: unknown): Spec => spec as Spec

test('context values resolve regardless of argument order', async () => {
  const Registry = Context.define<string>('registry')

  const api = Resource.service('api').spec((c) => ({ image: `${c.use(Registry)}/api` }))

  // The context value is passed *after* the resource that reads it.
  const spec = await Stack.compose(api, Registry.create('ghcr.io/acme'))

  expect(spec.services.api.image).toBe('ghcr.io/acme/api')
})

test('a missing context names itself', async () => {
  const Missing = Context.define<string>('registry')
  const api = Resource.service('api').spec((c) => ({ image: c.use(Missing) }))

  await expect(Stack.compose(api)).rejects.toThrow(/service\.api: context "registry" was not provided/)
})

test('use() builds a resource once no matter how many times it is referenced', async () => {
  let built = 0
  const net = Resource.network('web').spec(() => {
    built++
    return { driver: 'bridge' }
  })

  const one = Resource.service('one').spec((c) => ({ image: 'one', networks: [c.use(net).name] }))
  const two = Resource.service('two').spec((c) => ({ image: 'two', networks: [c.use(net).name] }))
  const three = Resource.service('three').spec((c) => ({ image: 'three', networks: [c.use(net).name] }))

  const spec = await Stack.compose(one, two, three)

  expect(built).toBe(1)
  expect(whole(spec).networks).toStrictEqual({ web: { driver: 'bridge' } })
})

test('registering a resource explicitly and through use() is the same registration', async () => {
  let built = 0
  const net = Resource.network('web').spec(() => {
    built++
    return { driver: 'bridge' }
  })
  const api = Resource.service('api').spec((c) => ({ image: 'api', networks: [c.use(net).name] }))

  const spec = await Stack.compose(net, api)

  expect(built).toBe(1)
  expect(spec.networks).toStrictEqual({ web: { driver: 'bridge' } })
})

test('a resource reached only through use() still lands in the output', async () => {
  const data = Resource.volume('data').spec(() => ({ driver: 'local' }))
  const db = Resource.service('db').spec((c) => ({
    image: 'postgres:16',
    volumes: [`${c.use(data).name}:/var/lib/postgresql/data`],
  }))

  const spec = await Stack.compose(db)

  expect(spec).toStrictEqual({
    services: { db: { image: 'postgres:16', volumes: ['data:/var/lib/postgresql/data'] } },
    volumes: { data: { driver: 'local' } },
  })
})

test('two different resources claiming one key is an error', async () => {
  const a = Resource.service('api').spec(() => ({ image: 'a' }))
  const b = Resource.service('api').spec(() => ({ image: 'b' }))

  await expect(Stack.compose(a, b)).rejects.toThrow(/duplicate service "api"/)
})

test('builder methods are pure, so a base resource is reusable', async () => {
  const base = Resource.service('api')
  const dev = base.spec(() => ({ image: 'api:dev' }))
  const prod = base.spec(() => ({ image: 'api:prod' }))

  expect(dev).not.toBe(prod)
  expect((await Stack.compose(dev)).services.api).toStrictEqual({ image: 'api:dev' })
  expect((await Stack.compose(prod)).services.api).toStrictEqual({ image: 'api:prod' })
})

test('errors are tagged with the resource that threw', async () => {
  const api = Resource.service('api').spec(() => {
    throw new Error('boom')
  })

  const error = await Stack.compose(api).catch((e: unknown) => e as Error)

  expect(error.message).toMatch(/^service\.api: boom$/)
  expect((error.cause as Error).message).toBe('boom')
})

test('async bodies may register further resources after awaiting', async () => {
  const late = Resource.network('late').spec(() => ({ driver: 'bridge' }))
  const api = Resource.service('api').spec(async (c) => {
    await new Promise((r) => setTimeout(r, 5))
    return { image: 'api', networks: [c.use(late).name] }
  })

  const spec = await Stack.compose(api)

  expect(whole(spec).networks).toStrictEqual({ late: { driver: 'bridge' } })
})

test('out handles break reference cycles between resources', async () => {
  const api: Resource<'service', 'api', any, any> = Resource.service('api')
    .out({ port: 3000 })
    .spec((c) => ({
      image: 'api',
      environment: { WORKER: `http://${c.use(worker).name}:${c.use(worker).port}` },
    }))

  const worker: Resource<'service', 'worker', any, any> = Resource.service('worker')
    .out({ port: 4000 })
    .spec((c) => ({
      image: 'worker',
      environment: { API: `http://${c.use(api).name}:${c.use(api).port}` },
    }))

  const spec = whole(await Stack.compose(api, worker))

  expect(spec.services!['api']!.environment).toStrictEqual({ WORKER: 'http://worker:4000' })
  expect(spec.services!['worker']!.environment).toStrictEqual({ API: 'http://api:3000' })
})

test('patch layers an override without forking the definition', async () => {
  const api = Resource.service('api').spec(() => ({ image: 'api', restart: 'unless-stopped' }))
  const scaled = api.patch((def) => ({ ...def, deploy: { replicas: 3 } }))

  expect((await Stack.compose(api)).services.api).toStrictEqual({ image: 'api', restart: 'unless-stopped' })
  expect((await Stack.compose(scaled)).services.api).toStrictEqual({
    image: 'api',
    restart: 'unless-stopped',
    deploy: { replicas: 3 },
  })
})
