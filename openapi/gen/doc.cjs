const require_runtime = require("../../_virtual/_rolldown/runtime.cjs");
let openapi_typescript = require("openapi-typescript");
openapi_typescript = require_runtime.__toESM(openapi_typescript, 1);
let node_path = require("node:path");
node_path = require_runtime.__toESM(node_path, 1);
let node_url = require("node:url");
let _redocly_openapi_core = require("@redocly/openapi-core");
//#region lib/openapi/src/gen/doc.ts
/** The OpenAPI document itself: fetching it, validating it, and the context its transforms need. */
var Doc = {
	/** The ruleset openapi-typescript runs with: enough to reject a broken document, not enough to be noisy. */
	config: () => (0, _redocly_openapi_core.createConfig)({}, { extends: ["minimal"] }),
	/** Validates a document and bundles its external `$ref`s into `components`. */
	load: async (source, options = {}) => {
		const config = options.config ?? await Doc.config();
		const resolver = new _redocly_openapi_core.BaseResolver(config.resolve);
		const doc = await locate(source, resolver, options.cwd ?? process.cwd());
		report(await (0, _redocly_openapi_core.lintDocument)({
			document: doc,
			config: config.styleguide,
			externalRefResolver: resolver
		}), options);
		const bundled = await (0, _redocly_openapi_core.bundle)({
			config,
			doc,
			externalRefResolver: resolver,
			dereference: false
		});
		report(bundled.problems, options);
		return bundled.bundle.parsed;
	},
	/**
	* The `GlobalContext` every openapi-typescript transform expects. Its own CLI builds
	* this inline; the flags below are that default set, all off bar the two named.
	*/
	context: (doc, redoc, over = {}) => ({
		...Object.fromEntries(Flags.map((flag) => [flag, false])),
		defaultNonNullable: true,
		silent: true,
		discriminators: openapi_typescript.scanDiscriminators(doc, {}),
		injectFooter: [],
		postTransform: void 0,
		transform: void 0,
		transformProperty: void 0,
		redoc,
		resolve: ($ref) => openapi_typescript.resolveRef(doc, $ref, { silent: true }),
		...over
	})
};
var Flags = [
	"additionalProperties",
	"alphabetize",
	"arrayLength",
	"conditionalEnums",
	"dedupeEnums",
	"defaultNonNullable",
	"emptyObjectsUnknown",
	"enum",
	"enumValues",
	"excludeDeprecated",
	"exportType",
	"generatePathParams",
	"immutable",
	"makePathsEnum",
	"pathParamsAsTypes",
	"propertiesRequiredByDefault",
	"readWriteMarkers",
	"rootTypes",
	"rootTypesKeepCasing",
	"rootTypesNoSchemaPrefix",
	"silent"
];
/** Strings that name a place rather than carry a document. */
var LOCATION_RE = /^(https?|file):\/\/|^\.{0,2}\/|\.(json|ya?ml)$/;
var locate = async (source, resolver, cwd) => {
	const root = node_path.default.join(cwd, "openapi.yaml");
	if (typeof source === "object" && !(source instanceof URL)) return {
		source: new _redocly_openapi_core.Source(root, JSON.stringify(source), "application/json"),
		parsed: source
	};
	if (typeof source === "string" && !LOCATION_RE.test(source)) return (0, _redocly_openapi_core.makeDocumentFromString)(source, root);
	const resolved = await resolver.resolveDocument(null, absolute(source, cwd), true);
	if ("parsed" in resolved) return resolved;
	throw resolved.originalError;
};
var absolute = (source, cwd) => {
	const url = source instanceof URL ? source : /^(https?|file):\/\//.test(source) ? new URL(source) : void 0;
	if (!url) return node_path.default.resolve(cwd, source);
	return url.protocol === "file:" ? (0, node_url.fileURLToPath)(url) : url.href;
};
var report = (problems, options) => {
	const fatal = problems.filter((p) => p.severity === "error");
	if (fatal.length) throw new Error(fatal.map(describe).join("\n"));
	if (!options.silent) for (const problem of problems) console.warn(describe(problem));
};
var describe = (problem) => {
	const at = problem.location?.[0]?.pointer;
	return at ? `${problem.message} at ${at}` : problem.message;
};
//#endregion
exports.Doc = Doc;

//# sourceMappingURL=doc.cjs.map