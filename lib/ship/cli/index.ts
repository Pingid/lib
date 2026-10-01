#!/usr/bin/env node
import { run } from '../src/config/index.ts'
import { configOf, load } from './resolve.ts'

const { file, rest } = configOf(process.argv.slice(2))

try {
  const config = await load(file)
  process.exitCode = await run({ ...config, argv: config.argv ?? rest })
} catch (error) {
  process.stderr.write(`error: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
}
