/** A peer taking an interest up, or dropping it */
export interface Declaration<K> {
    readonly key: K;
    readonly on: boolean;
}
