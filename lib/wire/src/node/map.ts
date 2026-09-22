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

import type { Node } from './node.ts'

// ------------------------------------------------------------------
// MapNode
// ------------------------------------------------------------------
/** Creates a node speaking B over one speaking A. A decode returning null drops the message. */
export function mapNode<A, B>(node: Node<A>, encode: (msg: B) => A, decode: (msg: A) => B | null): Node<B> {
  return {
    send: (msg) => node.send(encode(msg)),
    listen: (fn) =>
      node.listen((msg) => {
        const out = decode(msg)
        if (out !== null) fn(out)
      }),
    closed: (fn) => node.closed(fn),
    close: () => node.close(),
  }
}

// ------------------------------------------------------------------
// Tagged
// ------------------------------------------------------------------
/**
 * mapNode with the tag-and-filter a shared transport ends up writing.
 *
 * @example
 * ```ts
 * const [x, y] = pair<unknown>()
 * chat.add(tagged<ChatFrame>(x, 'chat'))
 * store.add(tagged<StoreFrame>(x, 'store')) // same wire, neither sees the other
 * ```
 */
export function tagged<T extends object>(node: Node<unknown>, tag: string): Node<T> {
  return mapNode<unknown, T>(
    node,
    (msg) => ({ ...msg, $: tag }),
    (raw) => {
      if (typeof raw !== 'object' || raw === null) return null
      const { $: seen, ...rest } = raw as { $?: unknown }
      return seen === tag ? (rest as T) : null
    },
  )
}
