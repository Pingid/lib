import { HubOptions, Meta } from '../../hub/index.cjs';
import { Node, Unsub } from '../../node/index.cjs';
import { Frame, Key, Watch } from './frame.cjs';
export interface StoreOptions extends HubOptions<Frame> {
    /** The tag this protocol's frames ride under, so one transport can carry several */
    name: string;
}
type Sink = (patch: unknown, at: Watch) => void;
/**
 * The same machinery as Topics under a compound key, with expand doing the wildcard. Shares
 * nothing with topics except Interest, which never learns what a collection is. One end: the
 * same call whether it hosts the others or joins them.
 *
 * @example
 * ```ts
 * const viewer = new Store({ name: 'store' })
 * viewer.add(server)
 * viewer.watch('users', '42', (patch) => apply(patch))
 * viewer.watch('users', '*', (patch, at) => log(at.id, patch))
 * viewer.patch('users', '42', { name: 'ada' })
 * ```
 */
export declare class Store {
    #private;
    constructor(options: StoreOptions);
    /** Joins another end over any node. The returned Unsub removes and closes it. */
    add(node: Node<unknown>, meta?: Meta): Unsub;
    /** Watches one record, or every record in the collection when id is '*' */
    watch(collection: string, id: string, fn: Sink): Unsub;
    /** Publishes a patch to everyone watching the record or its collection */
    patch(collection: string, id: string, patch: unknown): boolean;
    /** Keys anyone on this hub is watching, its own peers included */
    watched(): readonly Key[];
    close(): void;
}
export {};
