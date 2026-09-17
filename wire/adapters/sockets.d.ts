import { Meta } from '../core.js';
import { Source } from './source.js';
/**
 * One `Source` for every server whose socket API is a handful of callbacks:
 * `ws`, Bun, Deno, a plain TCP server.
 *
 * @example
 * ```ts
 * const wire = sockets<WebSocket, Frame>()
 * wss.on('connection', (ws) => {
 *   wire.open(ws)
 *   ws.on('message', (data) => wire.message(ws, data))
 *   ws.on('close', () => wire.close(ws))
 * })
 * wire.source(hub)
 * ```
 */
/**
 * Enough of a socket to send on and hang up.
 *
 * @example
 * ```ts
 * const socket: Socket = { send: (data) => ws.send(data as string), close: () => ws.close() }
 * ```
 */
export interface Socket {
    send(data: never): unknown;
    close(): unknown;
}
/**
 * Defaults to JSON text frames.
 *
 * @example
 * ```ts
 * sockets<WebSocket, Frame>({
 *   encode: (msg) => `${JSON.stringify(msg)}\n`,
 *   decode: (data) => JSON.parse(String(data)) as Frame,
 *   meta: (ws) => ({ name: ws.url }),
 * })
 * ```
 */
export interface SocketsOptions<S, T> {
    encode?: ((msg: T) => unknown) | undefined;
    decode?: ((data: unknown) => T) | undefined;
    meta?: ((socket: S) => Meta) | undefined;
    onError?: ((err: unknown) => void) | undefined;
}
/**
 * Wire the four methods straight to whatever the platform calls its socket events.
 *
 * @example
 * ```ts
 * const wire = sockets<Socket, Frame>()
 * server.on('connection', (socket) => wire.open(socket, { name: socket.remoteAddress }))
 * ```
 */
export interface Sockets<S, T> {
    open(socket: S, meta?: Meta): void;
    message(socket: S, data: unknown): void;
    close(socket: S): void;
    /**
     * Reported even for a socket with no node, which is what a failed upgrade looks like.
     *
     * @example
     * ```ts
     * ws.on('error', (err) => wire.error(ws, err))
     * ```
     */
    error(socket: S, err: unknown): void;
    readonly source: Source<T>;
}
/**
 * Events are relayed rather than offered directly, so a socket connecting before
 * anything serves the source reads as "nobody was listening" instead of a crash.
 *
 * @example
 * ```ts
 * const wire = sockets<WebSocket, Frame>({ meta: (ws) => ({ name: ws.url }) })
 * const stop = wire.source(hub)
 *
 * wss.on('connection', (ws) => {
 *   wire.open(ws)
 *   ws.on('message', (data) => wire.message(ws, data))
 *   ws.on('close', () => wire.close(ws))
 *   ws.on('error', (err) => wire.error(ws, err))
 * })
 * ```
 */
export declare const sockets: <S extends Socket, T>(opts?: SocketsOptions<S, T>) => Sockets<S, T>;
