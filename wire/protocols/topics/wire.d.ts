import { HubOptions, Meta, Peer } from '../../hub/index.js';
import { Node, Unsub } from '../../node/index.js';
import { Channels, Frame } from './frame.js';
import { Topic } from './topic.js';
export interface WireOptions<C extends Channels> extends HubOptions<Frame> {
    /** The tag this protocol's frames ride under, so one transport can carry several */
    name: string;
    /** Channels whose last payload is replayed to whoever asks for them next */
    retain?: readonly (keyof C & string)[] | undefined;
}
/**
 * Channels keyed by a name: Interest for the table, Directory for replies, twenty lines for
 * the rest. One end, and the same call whether it hosts the others or joins them.
 *
 * @example
 * ```ts
 * const page = new Wire<{ tick: number }>({ name: 'app', retain: ['tick'] })
 * page.add(worker)
 * page.topic('tick').listen((n, meta) => console.log(n, meta.from))
 * page.topic('tick').send(1)
 * ```
 */
export declare class Wire<C extends Channels> {
    #private;
    constructor(options: WireOptions<C>);
    /** Joins another end over any node. The returned Unsub removes and closes it. */
    add(node: Node<unknown>, meta?: Meta): Unsub;
    /** The ends joined to this one, its own participation excluded */
    get peers(): readonly Peer<Frame>[];
    /** One channel, typed by C */
    topic<K extends keyof C & string>(channel: K): Topic<C[K]>;
    close(): void;
}
