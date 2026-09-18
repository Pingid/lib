import { expect, test } from 'vitest'

import { Context, Project, Resource, Stack } from '../src/index.ts'

const sharedNetwork = () =>
  Resource.network('web')
    .spec(() => ({ driver: 'bridge' }))
    .shared()

test('a cross-stack ref becomes an external stub and a dependency edge', async () => {
  const web = sharedNetwork()
  const platform = Stack.create('platform', [web])

  const app = Stack.create('app', [
    Resource.service('api').spec((c) => ({ image: 'api', networks: [c.ref(platform, web).name] })),
  ])

  const built = await Project.build(platform, app)

  expect(built.specs['platform']!.networks).toStrictEqual({ web: { driver: 'bridge', name: 'web' } })
  expect(built.specs['app']!.networks).toStrictEqual({ web: { external: true, name: 'web' } })
  expect(built.specs['app']!.services!['api']!.networks).toStrictEqual(['web'])
  expect(built.edges).toStrictEqual([['platform', 'app']])
  expect(built.order).toStrictEqual(['platform', 'app'])
})

test('order is topological even when stacks are declared out of order', async () => {
  const web = sharedNetwork()
  const platform = Stack.create('platform', [web])
  const app = Stack.create('app', [
    Resource.service('api').spec((c) => ({ image: 'api', networks: [c.ref(platform, web).name] })),
  ])

  const built = await Project.build(app, platform)

  expect(built.order).toStrictEqual(['platform', 'app'])
})

test('a shared name can differ from the resource key', async () => {
  const web = Resource.network('web')
    .spec(() => ({ driver: 'bridge' }))
    .shared('acme-web')
  const platform = Stack.create('platform', [web])
  const app = Stack.create('app', [
    Resource.service('api').spec((c) => ({ image: 'api', networks: [c.ref(platform, web).name] })),
  ])

  const built = await Project.build(platform, app)

  expect(built.specs['app']!.networks).toStrictEqual({ web: { external: true, name: 'acme-web' } })
  expect(built.specs['app']!.services!['api']!.networks).toStrictEqual(['web'])
})

test('referencing a resource that does not pin a docker name is an error', async () => {
  const web = Resource.network('web').spec(() => ({ driver: 'bridge' }))
  const platform = Stack.create('platform', [web])
  const app = Stack.create('app', [
    Resource.service('api').spec((c) => ({ image: 'api', networks: [c.ref(platform, web).name] })),
  ])

  await expect(Project.build(platform, app)).rejects.toThrow(/does not pin a docker name/)
})

test('referencing a resource the other stack does not declare is an error', async () => {
  const web = sharedNetwork()
  const platform = Stack.create('platform', [])
  const app = Stack.create('app', [
    Resource.service('api').spec((c) => ({ image: 'api', networks: [c.ref(platform, web).name] })),
  ])

  await expect(Project.build(platform, app)).rejects.toThrow(/is not declared in stack "platform"/)
})

test('repeating the same ref is fine', async () => {
  const web = sharedNetwork()
  const platform = Stack.create('platform', [web])
  const app = Stack.create('app', [
    Resource.service('api').spec((c) => ({ image: 'api', networks: [c.ref(platform, web).name] })),
    Resource.service('worker').spec((c) => ({ image: 'worker', networks: [c.ref(platform, web).name] })),
  ])

  const built = await Project.build(platform, app)

  expect(built.specs['app']!.networks).toStrictEqual({ web: { external: true, name: 'web' } })
  expect(built.edges).toStrictEqual([['platform', 'app']])
})

test('a cycle between stacks is an error', async () => {
  const a = Resource.network('a')
    .spec(() => ({}))
    .shared()
  const b = Resource.network('b')
    .spec(() => ({}))
    .shared()

  const left: Stack = Stack.create('left', [
    a,
    Resource.service('l').spec((c) => ({ image: 'l', networks: [c.ref(right, b).name] })),
  ])
  const right: Stack = Stack.create('right', [
    b,
    Resource.service('r').spec((c) => ({ image: 'r', networks: [c.ref(left, a).name] })),
  ])

  await expect(Project.build(left, right)).rejects.toThrow(/cycle between stacks/)
})

test('project-level contexts reach every stack', async () => {
  const Registry = Context.define<string>('registry')

  const one = Stack.create('one', [Resource.service('a').spec((c) => ({ image: `${c.use(Registry)}/a` }))])
  const two = Stack.create('two', [Resource.service('b').spec((c) => ({ image: `${c.use(Registry)}/b` }))])

  const built = await Project.build(Registry.create('ghcr.io/acme'), one, two)

  expect(built.specs['one']!.services!['a']!.image).toBe('ghcr.io/acme/a')
  expect(built.specs['two']!.services!['b']!.image).toBe('ghcr.io/acme/b')
})

test('a stack-local context shadows the project one', async () => {
  const Tag = Context.define<string>('tag')

  const one = Stack.create('one', [Resource.service('a').spec((c) => ({ image: `a:${c.use(Tag)}` }))])
  const two = Stack.create('two', [
    Tag.create('edge'),
    Resource.service('b').spec((c) => ({ image: `b:${c.use(Tag)}` })),
  ])

  const built = await Project.build(Tag.create('stable'), one, two)

  expect(built.specs['one']!.services!['a']!.image).toBe('a:stable')
  expect(built.specs['two']!.services!['b']!.image).toBe('b:edge')
})

test('the same resource in two stacks is built once per stack', async () => {
  let built = 0
  const data = Resource.volume('data').spec(() => {
    built++
    return { driver: 'local' }
  })

  const one = Stack.create('one', [data])
  const two = Stack.create('two', [data])

  const result = await Project.build(one, two)

  expect(built).toBe(2)
  expect(result.specs['one']!.volumes).toStrictEqual({ data: { driver: 'local' } })
  expect(result.specs['two']!.volumes).toStrictEqual({ data: { driver: 'local' } })
})

test('each stack carries its docker project name', async () => {
  const one = Stack.create('one', [Resource.service('a').spec(() => ({ image: 'a' }))], { project: 'acme-one' })

  const built = await Project.build(one)

  expect(built.projects['one']).toBe('acme-one')
  expect(built.specs['one']!.name).toBe('acme-one')
})

test('.shared() survives a later .spec() in the chain', async () => {
  const web = Resource.network('web')
    .shared('acme-web')
    .spec(() => ({ driver: 'bridge' }))
  const platform = Stack.create('platform', [web])
  const app = Stack.create('app', [
    Resource.service('api').spec((c) => ({ image: 'api', networks: [c.ref(platform, web).name] })),
  ])

  const built = await Project.build(platform, app)

  // The owning stack must pin the same name the consumer references, or `external` cannot resolve.
  expect(built.specs['platform']!.networks).toStrictEqual({ web: { driver: 'bridge', name: 'acme-web' } })
  expect(built.specs['app']!.networks).toStrictEqual({ web: { external: true, name: 'acme-web' } })
})

test('referencing your own stack is just a local use', async () => {
  const web = Resource.network('web')
    .spec(() => ({ driver: 'bridge' }))
    .shared()
  const self: Stack = Stack.create('platform', [
    web,
    Resource.service('api').spec((c) => ({ image: 'api', networks: [c.ref(self, web).name] })),
  ])

  const built = await Project.build(self)

  expect(built.specs['platform']!.networks).toStrictEqual({ web: { driver: 'bridge', name: 'web' } })
  expect(built.edges).toStrictEqual([])
})
