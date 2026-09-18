import { expect, test, vi } from 'vitest'

import { Recipe, type RecipeApi } from './recipe.ts'

type Opts = { message: string; amend?: boolean }

const build = (
  execute = vi.fn(async (o: Partial<Opts>) => o),
  init?: Partial<Opts>,
): [RecipeApi<Opts, Partial<Opts>>, typeof execute] => [
  Recipe.create<Opts, Partial<Opts>>(
    {
      options: { message: null, amend: null },
      resolve: (opts, key, value) => ({ ...opts, [key]: value === undefined ? true : value }),
      execute,
    },
    init,
  ),
  execute,
]

test('each chained call collects an option, and awaiting runs the command', async () => {
  const [recipe] = build()
  await expect(recipe.message('release').amend()).resolves.toEqual({ message: 'release', amend: true })
})

test('nothing runs until the recipe is awaited', async () => {
  const [recipe, execute] = build()
  const pending = recipe.message('x')
  expect(execute).not.toHaveBeenCalled()
  await pending
  expect(execute).toHaveBeenCalledOnce()
})

test('awaiting the same link twice runs the command once', async () => {
  const [recipe, execute] = build()
  const pending = recipe.message('x')
  await Promise.all([pending, pending])
  expect(execute).toHaveBeenCalledOnce()
})

test('a recipe starts from the options it was created with', async () => {
  const [recipe] = build(undefined, { message: 'seed' })
  await expect(recipe.amend()).resolves.toEqual({ message: 'seed', amend: true })
})

test('a later call overrides an earlier one, and branching off a link is independent', async () => {
  const [recipe] = build()
  const base = recipe.message('one')
  await expect(base.message('two')).resolves.toEqual({ message: 'two' })
  await expect(base.amend()).resolves.toEqual({ message: 'one', amend: true })
})

test('only declared options are builder methods', () => {
  const [recipe] = build()
  expect((recipe as any).execute).toBeUndefined()
  expect((recipe as any).options).toBeUndefined()
  expect((recipe as any).nonsense).toBeUndefined()
})

test('a rejection is catchable like any promise', async () => {
  const [recipe] = build(vi.fn(async () => Promise.reject(new Error('boom'))) as any)
  await expect(recipe.message('x')).rejects.toThrow('boom')
})
