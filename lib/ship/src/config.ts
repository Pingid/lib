import type { Context } from './context.ts'
import type { Spec } from './registry.ts'

type Multi = Record<string, Spec> & { $provide?: Context[] }
type Single = Spec & { $provide?: Context[] }

export type Config = Multi | Single

export function defineConfig<const T extends Multi>(config: T): T
export function defineConfig<const T extends Multi>(config: () => T): T
export function defineConfig<const T extends Multi>(config: () => Promise<T>): Promise<T>
export function defineConfig<const T extends Single>(config: T): T
export function defineConfig<const T extends Single>(config: () => T): T
export function defineConfig<const T extends Single>(config: () => Promise<T>): Promise<T>
export function defineConfig<const T extends Single>(config: T): T {
  return config
}
