import { expect, test } from 'vitest'
import path from 'node:path'

import { configOf, load } from '../cli/resolve.ts'

const examples = path.resolve(import.meta.dirname, '../examples')

test('a config loads with cwd set to its own directory', async () => {
  const config = await load(path.join(examples, 'ship.config.ts'))

  expect(Object.keys(config.stacks)).toStrictEqual(['app'])
  expect(config.cwd).toBe(examples)
})

test('--config is ship’s only ahead of the first word', () => {
  expect(configOf(['-c', 'a.ts', 'app', 'up'])).toStrictEqual({ file: 'a.ts', rest: ['app', 'up'] })
  expect(configOf(['--config=a.ts', 'up'])).toStrictEqual({ file: 'a.ts', rest: ['up'] })
  expect(configOf(['-ca.ts', '--help'])).toStrictEqual({ file: 'a.ts', rest: ['--help'] })
  expect(configOf(['app', 'exec', '-c', 'x'])).toStrictEqual({ file: undefined, rest: ['app', 'exec', '-c', 'x'] })
})
