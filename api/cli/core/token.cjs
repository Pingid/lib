//#region lib/api/src/cli/core/token.ts
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
var tokenize = (argv) => {
	const tokens = [];
	let terminated = false;
	for (const [index, text] of argv.entries()) {
		if (terminated) {
			tokens.push({
				kind: "operand",
				text,
				index,
				terminated: true
			});
			continue;
		}
		if (text === "--") {
			terminated = true;
			tokens.push({
				kind: "terminator",
				text,
				index
			});
			continue;
		}
		if (text.startsWith("--")) {
			const eq = text.indexOf("=");
			const name = eq === -1 ? text.slice(2) : text.slice(2, eq);
			tokens.push({
				kind: "long",
				text,
				index,
				name,
				inline: eq === -1 ? void 0 : text.slice(eq + 1)
			});
			continue;
		}
		if (text.length > 1 && text.startsWith("-") && !/^-[.\d]/.test(text)) {
			const eq = text.indexOf("=");
			const body = eq === -1 ? text.slice(1) : text.slice(1, eq);
			tokens.push({
				kind: "short",
				text,
				index,
				body,
				inline: eq === -1 ? void 0 : text.slice(eq + 1)
			});
			continue;
		}
		tokens.push({
			kind: "operand",
			text,
			index,
			terminated: false
		});
	}
	return tokens;
};
//#endregion
exports.tokenize = tokenize;

//# sourceMappingURL=token.cjs.map