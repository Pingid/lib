/** Detaches whatever handed it back */
export type Unsub = () => void;
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
    send(msg: T): boolean;
    /** Subscribes to inbound messages */
    listen(fn: (msg: T) => void): Unsub;
    /** Terminal. Fires immediately if the node is already closed. */
    closed(fn: () => void): Unsub;
    /** Closes this node */
    close(): void;
}
