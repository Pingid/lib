export declare namespace Token {
    interface Base {
        /** The argv element, verbatim. */
        text: string;
        /** Index in the argv it came from. */
        index: number;
    }
    interface Terminator extends Base {
        kind: 'terminator';
    }
    /** `--name`, `--name=inline`. */
    interface Long extends Base {
        kind: 'long';
        name: string;
        inline: string | undefined;
    }
    /** `-abc`, `-n5`, `-n=5`. Never `-`, `-5` or `-.5`. */
    interface Short extends Base {
        kind: 'short';
        /** Every character between the dash and any `=`. */
        body: string;
        inline: string | undefined;
    }
    /** A positional, or anything after `--`. */
    interface Operand extends Base {
        kind: 'operand';
        terminated: boolean;
    }
    type Any = Terminator | Long | Short | Operand;
}
/**
 * Classify argv. Resolves nothing against a command — `-x` is a short token whether or not
 * `x` exists. Exactly one token per element, so indices line up with the argv and a
 * consumer can still look ahead by index.
 *
 * @example tokenize(['--env=dev']) // [{ kind: 'long', name: 'env', inline: 'dev' }]
 * @example tokenize(['-n5'])       // [{ kind: 'short', body: 'n5', inline: undefined }]
 * @example tokenize(['-5'])        // [{ kind: 'operand', terminated: false }]
 * @example tokenize(['--', '-x'])  // [{ kind: 'terminator' }, { kind: 'operand', terminated: true }]
 */
export declare const tokenize: (argv: readonly string[]) => Token.Any[];
export declare const Token: {
    tokenize: (argv: readonly string[]) => Token.Any[];
};
