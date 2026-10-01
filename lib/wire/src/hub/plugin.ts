import type { Hooks } from './hooks.ts'
import type { Hub } from './hub.ts'

// ------------------------------------------------------------------
// Plugin
// ------------------------------------------------------------------

/** Contributes hooks to a Hub. Bound once per hub, so state lives on the instance. */
export interface Plugin<T = unknown> {
  /** Binds this plugin to a hub and returns the hooks it contributes */
  bind(hub: Hub<T>): Hooks<T>
}

// ------------------------------------------------------------------
// PluginCallback
// ------------------------------------------------------------------

/** The bind function of a Plugin, for plugins written inline */
export type PluginCallback<T = unknown> = (hub: Hub<T>) => Hooks<T>

// ------------------------------------------------------------------
// Plugin
// ------------------------------------------------------------------

/** Creates a Plugin from a bind callback */
export function plugin<T = unknown>(bind: PluginCallback<T>): Plugin<T> {
  return { bind }
}
