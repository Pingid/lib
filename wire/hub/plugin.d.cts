import { Hooks } from './hooks.cjs';
import { Hub } from './hub.cjs';
/** Contributes hooks to a Hub. Bound once per hub, so state lives on the instance. */
export interface Plugin<T = unknown> {
    /** Binds this plugin to a hub and returns the hooks it contributes */
    bind(hub: Hub<T>): Hooks<T>;
}
/** The bind function of a Plugin, for plugins written inline */
export type PluginCallback<T = unknown> = (hub: Hub<T>) => Hooks<T>;
/** Creates a Plugin from a bind callback */
export declare function plugin<T = unknown>(bind: PluginCallback<T>): Plugin<T>;
