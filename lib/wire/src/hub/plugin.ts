/*--------------------------------------------------------------------------

@pingid/lib-wire

The MIT License (MIT)

Copyright (c) 2026 Dan Beaven <dm.beaven@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

---------------------------------------------------------------------------*/

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
