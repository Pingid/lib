/*--------------------------------------------------------------------------

@pingid/lib-wire/adapters

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

import type { Node } from '../node/node.ts'
import { TransportNode, type TransportOptions } from '../node/transport.ts'

// ------------------------------------------------------------------
// PostTarget
// ------------------------------------------------------------------
/** Structural, not lib.dom: a Worker, a MessagePort, a BroadcastChannel, a worker's own global, a stub in a test. */
export interface PostTarget {
  postMessage(msg: unknown): void
  addEventListener(type: 'message', fn: (event: { data: unknown }) => void): void
  removeEventListener(type: 'message', fn: (event: { data: unknown }) => void): void
  start?(): void
  terminate?(): void
  close?(): void
}

// ------------------------------------------------------------------
// PostMessageOptions
// ------------------------------------------------------------------
export interface PostMessageOptions<T> extends TransportOptions<T> {
  /**
   * Terminate or close the target when the node ends. Defaults to true when the target
   * has terminate, since you only hold that handle to one you created.
   */
  own?: boolean | undefined
}

// ------------------------------------------------------------------
// FromPostMessage
// ------------------------------------------------------------------
/**
 * Creates a node over anything with postMessage and message events. A failed clone is a
 * bad payload, not a dead port, so it is reported rather than fatal.
 *
 * @example
 * ```ts
 * // in the page
 * hub.add(fromPostMessage<Frame>(new Worker('./worker.js')))
 *
 * // in the worker
 * hub.add(fromPostMessage<Frame>(self as unknown as PostTarget))
 * ```
 */
export function fromPostMessage<T>(target: PostTarget, options: PostMessageOptions<T> = {}): Node<T> {
  const own = options.own ?? typeof target.terminate === 'function'

  return new TransportNode<T>((host) => {
    const on = (event: { data: unknown }) => host.deliver(event.data as T)
    target.addEventListener('message', on)
    target.start?.()

    return {
      send: (msg) => {
        try {
          target.postMessage(msg)
          return true
        } catch (err) {
          host.fail(err)
          return false
        }
      },
      release: () => {
        target.removeEventListener('message', on)
        if (!own) return
        if (target.terminate) target.terminate()
        else target.close?.()
      },
    }
  }, options)
}
