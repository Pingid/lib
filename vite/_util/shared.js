//#region lib/vite/src/_util/shared.ts
var Jitt = class Jitt {
	static create() {
		return new Jitt();
	}
	static str(s) {
		return JSON.stringify(s);
	}
	constructor() {}
	lns = [];
	indent = 0;
	ln(...ln) {
		this.lns.push(...ln.flat().map((l) => " ".repeat(this.indent) + l));
	}
	append(s) {
		this.lns[this.lns.length - 1] += s;
	}
	block(cb) {
		this.lns[this.lns.length - 1] += " {";
		this.indent += 2;
		cb();
		this.indent -= 2;
		this.ln("}");
	}
	fields(cb) {
		this.lns[this.lns.length - 1] += " {";
		this.indent += 2;
		cb((name, value) => {
			if (typeof value !== "function") return this.ln(`${Jitt.str(name)}: ${value},`);
			this.ln(`${Jitt.str(name)}:`);
			value();
			this.lns[this.lns.length - 1] += ",";
		});
		this.indent -= 2;
		this.ln("}");
	}
	child() {
		return new Jitt();
	}
	insert(at, jitt) {
		this.lns.splice(at, 0, ...jitt.lns);
	}
	toString() {
		return this.lns.join("\n");
	}
};
//#endregion
export { Jitt };

//# sourceMappingURL=shared.js.map