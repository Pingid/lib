import type { Node } from '../core.ts'
import { defineNode, type DefineOptions } from './define.ts'

/**
 * Anything with `postMessage` and `message` events: a `Worker`, a `MessagePort`,
 * a `BroadcastChannel`, a worker's own global.
 *
 * @example
 * ```ts
 * hub.add(fromPostMessage<Frame>(new Worker('./worker.js')), { name: 'worker' })
 * ```
 */

/**
 * Structural, not `lib.dom`: a stub in a test satisfies it too.
 *
 * @example
 * ```ts
 * const fake: PostTarget = {
 *   postMessage: (msg) => sink.push(msg),
 *   addEventListener: (_type, fn) => listeners.add(fn),
 *   removeEventListener: (_type, fn) => listeners.delete(fn),
 * }
 * ```
 */
export interface PostTarget {
  postMessage(msg: unknown): void
  addEventListener(type: 'message', fn: (event: { data: unknown }) => void): void
  removeEventListener(type: 'message', fn: (event: { data: unknown }) => void): void
  start?(): void
  terminate?(): void
  close?(): void
}

/**
 * @example
 * ```ts
 * fromPostMessage<Frame>(port, { own: false }) // a port someone else hands you
 * ```
 */
export interface PostMessageOptions<T> extends DefineOptions<T> {
  /**
   * Terminate or close the target when the node ends. Defaults to true when the
   * target has `terminate`, since you only hold that handle to one you created.
   *
   * @example
   * ```ts
   * fromPostMessage<Frame>(self as unknown as PostTarget, { own: false }) // never close yourself
   * ```
   */
  own?: boolean | undefined
}

/**
 * A failed clone is a bad payload, not a dead port, so it is reported rather than fatal.
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
export const fromPostMessage = <T>(target: PostTarget, opts: PostMessageOptions<T> = {}): Node<T> => {
  const own = opts.own ?? typeof target.terminate === 'function'

  return defineNode<T>((host) => {
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
  }, opts)
}
