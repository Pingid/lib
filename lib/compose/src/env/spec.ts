import { register } from './resolve.ts'

export const get = (key: string, defaultValue?: string) => {
  const value = process.env[key]
  if (!value) {
    if (defaultValue) return `\${${key}:-${defaultValue}}`
    register(key)
    return `\${${key}}`
  }
  return value
}

export const required = (key: string) => {
  const value = process.env[key]
  if (!value) throw new Error(`Environment variable ${key} is not set`)
  return value
}

export const optional = (key: string, defaultValue: string = ''): string => {
  const value = process.env[key]
  if (!value) return `\${${key}:-${defaultValue}}`
  return value
}

export const init = (key: string, init: string) => {
  const value = process.env[key]
  if (!value) {
    register(key, init)
    return `\${${key}}`
  }
  return value
}
