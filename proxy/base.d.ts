import { ProxyContext } from './context.js';
/**
 * A single policy step.
 *
 * The context is threaded rather than captured because a policy is built once
 * and applied many times: anything a step closes over is decided at startup,
 * and `clientIp`/`trustedPeer` are facts about the request in hand. A step that
 * ignores it just declares one parameter — a shorter function is assignable to
 * a longer function type, so nothing is forced to care.
 */
type Fn<T, R> = (x: T, context: ProxyContext) => R;
type MapperFn<T, R> = (current: Fn<T, R>, next: Fn<T, R>) => Fn<T, R>;
export declare class BasePolicy<T, R = T> {
    protected mod: Fn<T, R>;
    protected readonly mapper: MapperFn<T, R>;
    constructor(mapper: MapperFn<T, R>, current: Fn<T, R>);
    /** Append one step. Subclasses build on this. */
    protected step(next: Fn<T, R>): this;
    /**
     * Splice other policies in, in order.
     *
     * The other policy's steps are snapshotted as they stand now — policies are
     * mutable, so anything appended to it afterwards will not show up here.
     */
    use(...policies: BasePolicy<T, R>[]): this;
    /**
     * Apply a branch only when the condition holds.
     *
     * This is a *build-time* choice, for facts that are settled before any request
     * arrives — an upstream's config, a feature flag. Per-request choices belong
     * inside a step, where the context is in hand.
     */
    when(condition: boolean, build: (policy: this) => unknown): this;
    /**
     * Run the policy.
     *
     * The default context is a fresh object rather than a shared constant: steps
     * are allowed to write to it, and a shared one would carry those writes into
     * unrelated calls.
     */
    applyTo(value: T, context?: ProxyContext): R;
}
export declare const compose: {
    /** Mutation pipeline: every step sees the same object. */
    effects: <T>() => MapperFn<T, void>;
    asyncPipe: <T>() => MapperFn<T, Promise<T>>;
    /** Transform pipeline where null means "dropped" — later steps are skipped. */
    nullablePipe: <T>() => MapperFn<T, T | null>;
};
export {};
