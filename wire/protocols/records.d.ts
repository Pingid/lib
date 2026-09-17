import { HubOptions, Meta, Node, Unsub } from '../core.js';
/**
 * The same machinery under a compound key. Shares nothing with `topics.ts`
 * except `interest`, which never learns what a collection is.
 *
 * @example
 * ```ts
 * const store = records('store')
 *
 * const viewer = store.node()
 * viewer.add(server)
 * viewer.watch('users', '42', (patch) => apply(patch))
 * viewer.watch('users', '*', (patch, at) => log(at.id, patch))
 * ```
 */
/**
 * `id` may be `'*'` for a whole collection.
 *
 * @example
 * ```ts
 * const one: Key = ['users', '42']
 * const all: Key = ['users', '*']
 * ```
 */
export type Key = readonly [collection: string, id: string];
export type Frame = {
    t: 'hello';
} | {
    t: 'watch';
    k: [string, string];
    on: boolean;
} | {
    t: 'patch';
    c: string;
    id: string;
    d: unknown;
};
/**
 * Which record a patch was for — the one you asked about, or one in a collection you watch.
 *
 * @example
 * ```ts
 * store.watch('users', '*', (patch, at) => console.log(at.id, patch))
 * ```
 */
export interface Watch {
    readonly collection: string;
    readonly id: string;
}
/**
 * One end. The same call whether it hosts the others or joins them.
 *
 * @example
 * ```ts
 * const store = records('store').node()
 * store.add(socket)
 * store.patch('users', '42', { name: 'ada' })
 * ```
 */
export interface Store {
    add(node: Node<unknown>, meta?: Meta): Unsub;
    /**
     * `id` may be `'*'` for every record in the collection.
     *
     * @example
     * ```ts
     * const off = store.watch('users', '42', (patch) => apply(patch))
     * ```
     */
    watch(collection: string, id: string, fn: (patch: unknown, at: Watch) => void): Unsub;
    /**
     * @example
     * ```ts
     * store.patch('users', '42', { name: 'ada' })
     * ```
     */
    patch(collection: string, id: string, patch: unknown): boolean;
    /**
     * Keys anyone on this hub is watching, its own peers included.
     *
     * @example
     * ```ts
     * console.log(server.watched()) // [['users', '42'], ['users', '*']]
     * ```
     */
    watched(): readonly Key[];
    close(): void;
}
/**
 * Interest in `(collection, id)`, with `expand` doing the wildcard.
 *
 * @example
 * ```ts
 * const store = records('store')
 * const server = store.node()
 * ```
 */
export declare const records: (name: string) => {
    node: (opts?: HubOptions<Frame>) => Store;
};
