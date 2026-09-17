import { Meta } from '../hub/index.cjs';
import { Source } from './source.cjs';
/** Enough of a socket to send on and hang up */
export interface Socket {
    send(data: never): unknown;
    close(): unknown;
}
/** Defaults to JSON text frames */
export interface SocketsOptions<S, T, M extends Meta = Meta> {
    encode?: ((msg: T) => unknown) | undefined;
    decode?: ((data: unknown) => T) | undefined;
    meta?: ((socket: S) => M) | undefined;
    onError?: ((err: unknown) => void) | undefined;
}
/**
 * One Source for every server whose socket API is a handful of callbacks: ws, Bun, Deno, a
 * plain TCP server. Events are relayed rather than offered directly, so a socket connecting
 * before anything serves the source reads as "nobody was listening" instead of a crash.
 *
 * @example
 * ```ts
 * const wire = new Sockets<WebSocket, Frame>({ meta: (ws) => ({ name: ws.url }) })
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
export declare class Sockets<S extends Socket, T, M extends Meta = Meta> {
    #private;
    constructor(options?: SocketsOptions<S, T, M>);
    /** A socket connected */
    open(socket: S, meta?: M): void;
    /** A socket carried a frame */
    message(socket: S, data: unknown): void;
    /** A socket hung up */
    close(socket: S): void;
    /** Reported even for a socket with no node, which is what a failed upgrade looks like */
    error(socket: S, err: unknown): void;
    /** The Source that turns these events into peers */
    get source(): Source<T>;
}
