import type { Spec } from '../resource.ts'

export { run, help } from './run.ts'

export interface Config {
  bin?: string
  /** Additional environment variables */
  env?: Record<string, string>
  /** Default arguments to pass to the command */
  defaultArgs?: string[]
  /**
   * Arguments that point the command at a stack's file, between `defaultArgs` and the user's own.
   * `cwd` is undefined for a path stack, whose own directory is already right
   * (default: `--project-directory <cwd> -f <file>`; podman-compose wants `(file) => ['-f', file]`)
   */
  fileArgs?: (file: string, cwd: string | undefined) => string[]
  /** Program arguments */
  argv?: string[]
  /** Directory relative paths in a stack resolve against (default: the config file's directory) */
  cwd?: string
  /** Default stack when not named */
  default?: string
  /** Docker compose stacks */
  stacks: Record<string, ConfigStack>
}

/** A compose file: resolved, still resolving, resolved on demand, or a path to one on disk. */
export type ConfigStack = Spec | Promise<Spec> | (() => Spec | Promise<Spec>) | string

export const define = (config: Config): Config => config
