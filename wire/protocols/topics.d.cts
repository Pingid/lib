import { Hub, HubOptions, Meta, Node, Unsub } from '../core.cjs';
/**
 * Channels keyed by a name. An example, not the library — `routes` below is the
 * only part that knows what a message means.
 *
 * @example
 * ```ts
 * const app = topics<{ tick: number }>({ name: 'app', retain: ['tick'] })
 *
 * const page = app.node()
 * page.add(worker)
 * page.topic('tick').listen((n, meta) => console.log(n, meta.from))
 * page.topic('tick').send(1)
 * ```
 */
/**
 * Payload types by channel name.
 *
 * @example
 * ```ts
 * type App = { tick: number; chat: string }
 * ```
 */
export type Channels = Record<string, unknown>;
/**
 * The wire. `interest` reads `want`, `directory` stamps `pub`.
 *
 * @example
 * ```ts
 * const frame: Frame = { t: 'pub', c: 'tick', d: 1, from: 'ab12-1' }
 * ```
 */
export type Frame = {
    t: 'hello';
} | {
    t: 'want';
    c: string;
    on: boolean;
} | {
    t: 'pub';
    c: string;
    d: unknown;
    from?: string;
    to?: string;
    r?: true;
};
/**
 * What came with a payload.
 *
 * @example
 * ```ts
 * topic.listen((n, meta) => meta.retained || reply(meta.from!))
 * ```
 */
export interface Message {
    readonly channel: string;
    readonly from: string | null;
    readonly retained: boolean;
}
/**
 * One channel, typed.
 *
 * @example
 * ```ts
 * const off = wire.topic('chat').listen((text) => console.log(text))
 * wire.topic('chat').send('hi')
 * ```
 */
export interface Topic<T> {
    send(payload: T, to?: string): boolean;
    listen(fn: (payload: T, meta: Message) => void): Unsub;
}
/**
 * One end. The same call whether it hosts the others or joins them.
 *
 * @example
 * ```ts
 * const wire = app.node()
 * wire.add(socket)
 * wire.topic('tick').send(1)
 * ```
 */
export interface Wire<C extends Channels> {
    add(node: Node<unknown>, meta?: Meta): Unsub;
    topic<K extends keyof C & string>(channel: K): Topic<C[K]>;
    readonly peers: Hub<Frame>['peers'];
    close(): void;
}
/**
 * @example
 * ```ts
 * topics<{ tick: number }>({ name: 'app', retain: ['tick'] })
 * ```
 */
export interface Options<C extends Channels> {
    name: string;
    retain?: readonly (keyof C & string)[] | undefined;
}
/**
 * `interest` for the table, `directory` for replies, twenty lines for the rest.
 *
 * @example
 * ```ts
 * const app = topics<{ tick: number }>({ name: 'app', retain: ['tick'] })
 * const wire = app.node()
 * ```
 */
export declare const topics: <C extends Channels>(spec: Options<C>) => {
    node: (opts?: HubOptions<Frame>) => Wire<C>;
};
