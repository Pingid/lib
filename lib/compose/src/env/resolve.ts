import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import { config } from 'dotenv'

let _required: Record<string, { init?: string | undefined }> = {}

const collect = () => ({ ..._required })
export const register = (key: string, init?: string) => {
  _required[key] = { init }
}

export const resolve = async (path: string) => {
  const envs = await load(path)
  const { envs: resolvedEnv, changed } = await resolveRequired(envs, collect())
  if (changed) await save(path, resolvedEnv)
  return resolvedEnv
}

const load = (path: string) => {
  const envs = config({ path: path }).parsed ?? ({} as Record<string, string>)
  return envs
}

const save = async (path: string, envs: Record<string, string>) => {
  await fs.writeFile(
    path,
    Object.entries(envs)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n'),
  )
}

const resolveRequired = (envs: Record<string, string>, required: Record<string, { init?: string | undefined }>) => {
  let changed = false
  for (const [key, value] of Object.entries(required)) {
    if (envs[key]) continue
    if (value.init) {
      const child = spawnSync('bash', ['-c', value.init], { stdio: ['inherit', 'pipe', 'inherit'] })
      if (child.status !== 0) {
        console.error(`Failed to initialize environment variable ${key}: ${value.init}`)
        process.exit(1)
      }
      envs[key] = child.stdout.toString().trim()
      changed = true
    }
  }
  return { envs, changed }
}
