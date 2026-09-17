const require_runtime = require("../../_virtual/_rolldown/runtime.cjs");
let node_path = require("node:path");
node_path = require_runtime.__toESM(node_path, 1);
let node_fs_promises = require("node:fs/promises");
node_fs_promises = require_runtime.__toESM(node_fs_promises, 1);
//#region lib/vite/src/_util/file.ts
var File = class File {
	static project(meta, pth) {
		return new File(node_path.default.resolve(node_path.default.dirname(meta.filename), pth.replace(node_path.default.extname(pth), node_path.default.extname(meta.filename))));
	}
	static for(...paths) {
		return new File(node_path.default.resolve(...paths));
	}
	_path;
	constructor(_path) {
		this._path = _path;
	}
	get dir() {
		return node_path.default.dirname(this.path);
	}
	get path() {
		return this._path;
	}
	async write(content) {
		if (await node_fs_promises.default.readFile(this.path, "utf8").catch(() => null) === content) return;
		await node_fs_promises.default.mkdir(node_path.default.dirname(this.path), { recursive: true });
		await node_fs_promises.default.writeFile(this.path, content);
	}
	toString() {
		return this.path;
	}
	[Symbol.for("nodejs.util.inspect.custom")]() {
		return this.toString();
	}
	[Symbol.toPrimitive]() {
		return this.toString();
	}
};
//#endregion
exports.File = File;

//# sourceMappingURL=file.cjs.map