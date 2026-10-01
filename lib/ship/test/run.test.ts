import { afterEach, beforeAll, expect, test, vi } from 'vitest'
import { tmpdir } from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

import { Config, Ship } from '../src/index.ts'

/** Stands in for docker: records what it was given, then exits with `CODE`. */
const RECORDER = `
import fs from 'node:fs'
const args = process.argv.slice(2)
const file = args[args.indexOf('-f') + 1]
fs.writeFileSync(process.env.OUT, JSON.stringify({ args, file, contents: fs.readFileSync(file, 'utf8'), x: process.env.X }))
process.exit(Number(process.env.CODE ?? 0))
`

type Recorded = { args: string[]; file: string; contents: string; x?: string }

let dir: string
let recorder: string
let out: string

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(tmpdir(), 'ship-test-'))
  recorder = path.join(dir, 'recorder.mjs')
  out = path.join(dir, 'out.json')
  fs.writeFileSync(recorder, RECORDER)
  return () => fs.rmSync(dir, { recursive: true, force: true })
})

afterEach(() => {
  vi.restoreAllMocks()
  fs.rmSync(out, { force: true })
})

const app = Ship.Resolve(Ship.Compose('app', [Ship.Service('web', () => ({ image: 'nginx' }))]), {})

const config = (overrides: Partial<Config.Config> & { argv: string[] }): Config.Config => ({
  bin: process.execPath,
  defaultArgs: [recorder],
  env: { OUT: out },
  cwd: dir,
  stacks: { app: () => app },
  ...overrides,
})

const recorded = (): Recorded => JSON.parse(fs.readFileSync(out, 'utf8'))

const stdout = () => {
  const writes: string[] = []
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => (writes.push(String(chunk)), true))
  return writes
}

test('a named stack is written to scratch and handed to compose with the remaining args', async () => {
  const code = await Config.run(config({ argv: ['app', 'up', '-d'], env: { OUT: out, X: 'passed' } }))
  const { args, file, contents, x } = recorded()

  expect(code).toBe(0)
  expect(args).toStrictEqual(['--project-directory', dir, '-f', file, 'up', '-d'])
  expect(path.basename(file)).toBe('app.json')
  expect(JSON.parse(contents)).toStrictEqual(await app)
  expect(x).toBe('passed')
  // Scratch is gone once docker exits.
  expect(fs.existsSync(path.dirname(file))).toBe(false)
})

test('the stack name may be omitted when there is one stack, or a default', async () => {
  await Config.run(config({ argv: ['ps'] }))
  expect(recorded().args.at(-1)).toBe('ps')

  await Config.run(config({ argv: ['ps'], default: 'app', stacks: { app: app, other: app } }))
  expect(recorded().args.at(-1)).toBe('ps')
})

test('several stacks and no name is an error that lists them', async () => {
  await expect(Config.run(config({ argv: ['ps'], stacks: { a: app, b: app } }))).rejects.toThrow('which stack? — a, b')
  await expect(Config.run(config({ argv: ['ps'], default: 'c', stacks: { a: app, b: app } }))).rejects.toThrow(
    'unknown stack "c" — expected one of a, b',
  )
})

test("docker's exit code is returned", async () => {
  expect(await Config.run(config({ argv: ['app', 'up'], env: { OUT: out, CODE: '3' } }))).toBe(3)
})

test('a path stack resolves against cwd and keeps its own project directory', async () => {
  fs.writeFileSync(path.join(dir, 'compose.yaml'), 'services:\n  web:\n    image: nginx\n')
  await Config.run(config({ argv: ['up'], stacks: { app: 'compose.yaml' } }))

  expect(recorded().args).toStrictEqual(['-f', path.join(dir, 'compose.yaml'), 'up'])
})

test('fileArgs replaces how the command is pointed at the file', async () => {
  const fileArgs = (file: string, cwd: string | undefined) => ['--from', String(cwd), '-f', file]
  await Config.run(config({ argv: ['up'], fileArgs }))
  const { args, file } = recorded()

  expect(args).toStrictEqual(['--from', dir, '-f', file, 'up'])
})

test('print writes the compose file to stdout without running docker', async () => {
  const writes = stdout()
  expect(await Config.run(config({ argv: ['app', 'print'] }))).toBe(0)

  expect(JSON.parse(writes.join(''))).toStrictEqual(await app)
  expect(fs.existsSync(out)).toBe(false)
})

test('no arguments prints help with the stacks', async () => {
  const writes = stdout()
  await Config.run(config({ argv: [], default: 'app', stacks: { app, other: app } }))

  expect(writes.join('')).toContain('Usage: ship')
  expect(writes.join('')).toContain('  app (default)\n  other\n')
})
