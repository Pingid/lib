import { Node, Unsub } from '../../node/index.cjs';
import { Frame, Message } from './frame.cjs';
export type Sink = (payload: unknown, meta: Message) => void;
/** One channel, typed */
export interface Topic<T> {
    /** Publishes to everyone listening, or to one sender when to is given */
    send(payload: T, to?: string): boolean;
    /** Subscribes to this channel. The first listener declares the interest. */
    listen(fn: (payload: T, meta: Message) => void): Unsub;
}
/** A Topic over a Wire's own node. Interest is declared on the first listener and dropped with the last. */
export declare class ChannelTopic<T> implements Topic<T> {
    #private;
    constructor(channel: string, node: Node<Frame>, sinks: Map<string, Set<Sink>>);
    send(payload: T, to?: string): boolean;
    listen(fn: (payload: T, meta: Message) => void): Unsub;
}
