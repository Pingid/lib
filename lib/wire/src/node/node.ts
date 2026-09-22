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

// ------------------------------------------------------------------
// Unsub
// ------------------------------------------------------------------
/** Detaches whatever handed it back */
export type Unsub = () => void

// ------------------------------------------------------------------
// Node
// ------------------------------------------------------------------
/**
 * One end of a duplex channel.
 *
 * @example
 * ```ts
 * const node: Node<string> = {
 *   send: (msg) => (socket.write(msg), true),
 *   listen: (fn) => (socket.on('data', fn), () => socket.off('data', fn)),
 *   closed: (fn) => (socket.on('close', fn), () => socket.off('close', fn)),
 *   close: () => socket.end(),
 * }
 * ```
 */
export interface Node<T = unknown> {
  /** Never throws. False when the message was dropped. */
  send(msg: T): boolean
  /** Subscribes to inbound messages */
  listen(fn: (msg: T) => void): Unsub
  /** Terminal. Fires immediately if the node is already closed. */
  closed(fn: () => void): Unsub
  /** Closes this node */
  close(): void
}
