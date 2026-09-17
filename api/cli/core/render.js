//#region lib/api/src/cli/core/render.ts
var Render = class Render {
	_out;
	_indent = 0;
	/** True when nothing has been written to the current line yet. */
	_fresh = true;
	static from(target) {
		return target instanceof Render ? target : new Render(target);
	}
	static create(out = process.stdout) {
		return new Render(out);
	}
	constructor(out = process.stdout) {
		this._out = out;
	}
	get width() {
		return this._out.columns ?? 80;
	}
	/** Scoped indentation — the level is restored even if `body` throws. */
	indent(body, amount = 2) {
		this._indent += amount;
		try {
			body(this);
		} finally {
			this._indent -= amount;
		}
		return this;
	}
	write(value) {
		const pad = " ".repeat(this._indent);
		const parts = value.split("\n");
		for (let i = 0; i < parts.length; i++) {
			if (i > 0) {
				this._out.write("\n");
				this._fresh = true;
			}
			const part = parts[i];
			if (part.length === 0) continue;
			if (this._fresh) {
				this._out.write(pad);
				this._fresh = false;
			}
			this._out.write(part);
		}
		return this;
	}
	line(value = "") {
		return this.write(`${value}\n`);
	}
	blank() {
		return this.line();
	}
	/** Two columns: labels padded to a common width, descriptions wrapped under themselves. */
	rows(rows, gap = 2) {
		const label = rows.reduce((max, [left]) => Math.max(max, left.length), 0);
		const width = Math.max(24, this.width - this._indent - label - gap);
		for (const [left, right] of rows) {
			if (!right) {
				this.line(left);
				continue;
			}
			const lines = wrap(right, width);
			this.line(`${left.padEnd(label)}${" ".repeat(gap)}${lines[0]}`);
			for (const extra of lines.slice(1)) this.line(`${" ".repeat(label + gap)}${extra}`);
		}
		return this;
	}
	/** A titled block of rows. Nothing is written when `rows` is empty. */
	section(title, rows, gap) {
		if (rows.length === 0) return this;
		this.blank().line(title);
		return this.indent((render) => render.rows(rows, gap));
	}
};
var wrap = (value, width) => {
	const words = value.split(/\s+/).filter(Boolean);
	const lines = [];
	let line = "";
	for (const word of words) if (line.length === 0) line = word;
	else if (line.length + 1 + word.length <= width) line += ` ${word}`;
	else {
		lines.push(line);
		line = word;
	}
	if (line.length > 0) lines.push(line);
	return lines.length > 0 ? lines : [""];
};
//#endregion
export { Render };

//# sourceMappingURL=render.js.map