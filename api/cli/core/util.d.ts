export type Struct = Record<string, any>;
export type Intersect<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
export type Compute<T> = {
    [K in keyof T]: T[K];
} & {};
