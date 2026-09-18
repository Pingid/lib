import { createJiti } from 'jiti'
import { expect, test } from 'vitest'

import { Context, ContextValue, Project, Resource, Stack } from '../src/index.ts'

/**
 * The CLI loads configs through jiti with its module cache off, which is what lets `--watch`
 * re-read a config without a stale graph. The cost is that a config reaching these sources gets
 * its own copy of them, so the classes it builds from are not the ones checked against here.
 * Disabling the cache is how that second copy is obtained on purpose.
 */
const duplicate = async () => {
  const jiti = createJiti(import.meta.url, { moduleCache: false })
  return jiti.import<typeof import('../src/index.ts')>('../src/index.ts')
}

test('a value from a separately loaded copy of the module still passes instanceof', async () => {
  const copy = await duplicate()
  const context = copy.Context.define<string>('registry')

  // Guards the premise: without this the test would pass for the wrong reason.
  expect(copy.Stack).not.toBe(Stack)
  expect(copy.Resource).not.toBe(Resource)

  expect(copy.Stack.create('web', [])).toBeInstanceOf(Stack)
  expect(copy.Resource.service('api')).toBeInstanceOf(Resource)
  expect(context).toBeInstanceOf(Context)
  expect(context.create('ghcr.io')).toBeInstanceOf(ContextValue)
})

test('branding does not make unrelated values match', async () => {
  const copy = await duplicate()

  expect(copy.Resource.service('api')).not.toBeInstanceOf(Stack)
  expect(copy.Stack.create('web', [])).not.toBeInstanceOf(ContextValue)
  expect({}).not.toBeInstanceOf(Stack)
  expect(null).not.toBeInstanceOf(Stack)
  expect('a string').not.toBeInstanceOf(Resource)
})

test('a project builds from stacks defined in another copy of the module', async () => {
  const copy = await duplicate()
  const api = copy.Resource.service('api').spec(() => ({ image: 'nginx:alpine' }))

  // Project.build dispatches on instanceof, so this is the path the CLI takes for every config.
  const project = await Project.build(copy.Stack.create('web', [api]))

  expect(project.order).toStrictEqual(['web'])
  expect(project.specs['web']?.services?.['api']).toStrictEqual({ image: 'nginx:alpine' })
})
