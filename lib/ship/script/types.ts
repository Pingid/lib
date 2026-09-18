import { compile } from 'json-schema-to-typescript'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import { join } from 'node:path'

const path = (...parts: string[]) => join(import.meta.dirname, '../', ...parts)

const gen = async () => {
  const j = await fetch(
    'https://raw.githubusercontent.com/docker/compose/refs/heads/v1/compose/config/compose_spec.json',
  )
  const data = await j.json()
  const ts = await compile(data, 'ComposeSpec', { format: false })
  const contents = ['// This file is generated from the Docker Compose json schema.', '', ts].join('\n')

  await fs.writeFile(path('src/types.d.ts'), contents.replace(/\[k:\s*string\]:\s*unknown/gim, ''))

  spawnSync('pnpm', ['prettier', '--write', path('src/types.d.ts')], { cwd: path(), stdio: 'inherit' })
}
gen()
