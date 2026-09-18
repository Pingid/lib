import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, expect, test } from 'vitest'

import { Shell, ShellError } from './shell.ts'

let dir: string
beforeAll(async () => void (dir = await mkdtemp(path.join(tmpdir(), 'shell-'))))
afterAll(async () => void (await rm(dir, { recursive: true, force: true })))

test('stdout is captured and trimmed', async () => {
  await expect(Shell.sho('echo', ['hello'])).resolves.toBe('hello')
})

test('run reports a non-zero exit instead of throwing', async () => {
  const r = await Shell.run('sh', ['-c', 'echo out; echo err >&2; exit 3'])
  expect(r).toMatchObject({ stdout: 'out', stderr: 'err', code: 3, signal: null })
})

test('sh throws a ShellError carrying the whole result', async () => {
  const error = await Shell.sh('sh', ['-c', 'echo err >&2; exit 3']).catch((e: unknown) => e)
  expect(error).toBeInstanceOf(ShellError)
  expect((error as ShellError).code).toBe(3)
  expect((error as ShellError).stderr).toBe('err')
  expect((error as ShellError).message).toContain('exit 3')
  expect((error as ShellError).message).toContain('err')
})

test('ok answers with the exit status, and swallows a missing command', async () => {
  await expect(Shell.ok('true', [])).resolves.toBe(true)
  await expect(Shell.ok('false', [])).resolves.toBe(false)
  await expect(Shell.ok('definitely-not-a-command', [])).resolves.toBe(false)
})

test('a command that cannot be spawned rejects', async () => {
  await expect(Shell.sho('definitely-not-a-command', [])).rejects.toThrow()
})

test('cwd, env and input reach the child', async () => {
  await expect(Shell.sho('pwd', [], { cwd: dir })).resolves.toContain(path.basename(dir))
  await expect(Shell.sho('sh', ['-c', 'echo $GREETING'], { env: { GREETING: 'hi' } })).resolves.toBe('hi')
  await expect(Shell.sho('cat', [], { input: 'piped' })).resolves.toBe('piped')
})

test('stdin is closed, so a command that reads it cannot hang', async () => {
  await expect(Shell.sho('cat', [])).resolves.toBe('')
})

test('inherited streams are not captured, but the status still is', async () => {
  const r = await Shell.io('echo', ['to the terminal'])
  expect(r).toMatchObject({ stdout: '', stderr: '', code: 0 })
})

test('io throws on a non-zero exit, with no output to quote', async () => {
  const error = await Shell.io('sh', ['-c', 'echo err >&2; exit 3']).catch((e: unknown) => e)
  expect(error).toBeInstanceOf(ShellError)
  expect((error as ShellError).code).toBe(3)
  expect((error as ShellError).message).toBe('sh -c echo err >&2; exit 3 failed (exit 3)')
})

test('io_run and io_ok report a failure instead of throwing', async () => {
  await expect(Shell.io_run('sh', ['-c', 'exit 3'])).resolves.toMatchObject({ code: 3 })
  await expect(Shell.io_ok('true', [])).resolves.toBe(true)
  await expect(Shell.io_ok('false', [])).resolves.toBe(false)
})

test('input still reaches an inherited command, which keeps stdin piped', async () => {
  const marker = path.join(dir, 'piped.txt')
  await Shell.io('sh', ['-c', `cat > ${marker}`], { input: 'from the parent' })
  await expect(readFile(marker, 'utf-8')).resolves.toBe('from the parent')
})

// Proves the fd is really the parent's: the outer capture sees what the inner command wrote
// to a stream it never had a pipe for.
test.skipIf(!process.features.typescript)('an inherited stream is the parent process own', async () => {
  const mod = new URL('./shell.ts', import.meta.url).pathname
  const script = `import { Shell } from ${JSON.stringify(mod)}
    await Shell.io('sh', ['-c', 'echo out; echo err >&2'])`

  const r = await Shell.run(process.execPath, ['--input-type=module', '-e', script])
  expect(r).toMatchObject({ stdout: 'out', stderr: 'err', code: 0 })
})

test('a timeout kills the child and reports the signal', async () => {
  const r = await Shell.run('sleep', ['30'], { timeout: 50 })
  expect(r.signal).toBe('SIGTERM')
  expect(r.code).toBeNull()
})
