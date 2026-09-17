//#region lib/api/src/http/docs/scalar/index.ts
/**
* Render a Scalar API reference page.
*
* Point it at a document with `url`, or inline one with `content`. Functions in the config are dropped, since it
* crosses into the page as JSON.
*
* @example
* scalar({ title: 'Items', version: '1.0.0' }, { url: '/docs/json' })
*/
var scalar = (info, config = {}) => {
	const { css = CSS, cdn = CDN, ...configuration } = config;
	const title = escape(info.title ?? "API Reference");
	const description = info.description && escape(info.description.split("\n")[0] ?? "");
	return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <meta property="og:title" content="${title}" />${description ? `
    <meta name="description" content="${description}" />
    <meta property="og:description" content="${description}" />` : ""}
    <style>body { margin: 0; }</style>${css ? `\n    <style>${css.replace(/<\/style/gi, "<\\/style")}</style>` : ""}
  </head>
  <body>
    <div id="app"></div>
    <script src="${escape(cdn)}" crossorigin><\/script>
    <script>Scalar.createApiReference('#app', ${script(configuration)})<\/script>
  </body>
</html>`;
};
var CDN = "https://cdn.jsdelivr.net/npm/@scalar/api-reference";
var ENTITIES = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	"\"": "&quot;",
	"'": "&#39;"
};
/** Escape text for an HTML attribute or element body. */
var escape = (s) => s.replace(/[&<>"']/g, (c) => ENTITIES[c]);
/** JSON safe to inline in a `<script>`: nothing in it can close the tag or open a comment. */
var script = (value) => JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
/**
* Neutral greys with no hue, the accent drawn in the text colour, and method and status colours kept to faint
* tints of grey. Scalar puts its theme in `@layer scalar-theme`, so these unlayered rules win, and anything left
* unset falls back to it.
*/
var CSS = `.light-mode {
  --scalar-color-1: oklch(21% 0 0);
  --scalar-color-2: oklch(44% 0 0);
  --scalar-color-3: oklch(58% 0 0);
  --scalar-color-accent: var(--scalar-color-1);

  --scalar-background-1: oklch(99.2% 0 0);
  --scalar-background-2: oklch(97% 0 0);
  --scalar-background-3: oklch(93.5% 0 0);
  --scalar-background-accent: oklch(0% 0 0 / 5%);

  --scalar-border-color: oklch(91% 0 0);

  --scalar-button-1: oklch(21% 0 0);
  --scalar-button-1-hover: oklch(32% 0 0);
  --scalar-button-1-color: oklch(99.2% 0 0);

  --scalar-color-green: oklch(48% 0.05 155);
  --scalar-color-red: oklch(50% 0.07 25);
  --scalar-color-yellow: oklch(54% 0.05 85);
  --scalar-color-blue: oklch(48% 0.05 250);
  --scalar-color-orange: oklch(52% 0.06 55);
  --scalar-color-purple: oklch(48% 0.05 300);
  --scalar-color-query: oklch(48% 0.04 200);

  --scalar-scrollbar-color: oklch(0% 0 0 / 16%);
  --scalar-scrollbar-color-active: oklch(0% 0 0 / 32%);
}

.dark-mode {
  --scalar-color-1: oklch(94% 0 0);
  --scalar-color-2: oklch(72% 0 0);
  --scalar-color-3: oklch(56% 0 0);
  --scalar-color-accent: var(--scalar-color-1);

  --scalar-background-1: oklch(15.5% 0 0);
  --scalar-background-2: oklch(19.5% 0 0);
  --scalar-background-3: oklch(25% 0 0);
  --scalar-background-accent: oklch(100% 0 0 / 7%);

  --scalar-border-color: oklch(27% 0 0);

  --scalar-button-1: oklch(94% 0 0);
  --scalar-button-1-hover: oklch(84% 0 0);
  --scalar-button-1-color: oklch(15.5% 0 0);

  --scalar-color-green: oklch(78% 0.05 155);
  --scalar-color-red: oklch(74% 0.07 25);
  --scalar-color-yellow: oklch(82% 0.05 85);
  --scalar-color-blue: oklch(78% 0.05 250);
  --scalar-color-orange: oklch(78% 0.06 55);
  --scalar-color-purple: oklch(78% 0.05 300);
  --scalar-color-query: oklch(78% 0.04 200);

  --scalar-scrollbar-color: oklch(100% 0 0 / 18%);
  --scalar-scrollbar-color-active: oklch(100% 0 0 / 36%);
}

.light-mode,
.dark-mode {
  --scalar-link-color: var(--scalar-color-1);
  --scalar-link-color-hover: var(--scalar-color-2);

  --scalar-sidebar-background-1: var(--scalar-background-1);
  --scalar-sidebar-color-1: var(--scalar-color-1);
  --scalar-sidebar-color-2: var(--scalar-color-2);
  --scalar-sidebar-border-color: var(--scalar-border-color);

  --scalar-sidebar-item-hover-background: var(--scalar-background-2);
  --scalar-sidebar-item-hover-color: var(--scalar-color-1);
  --scalar-sidebar-item-active-background: var(--scalar-background-3);
  --scalar-sidebar-color-active: var(--scalar-color-1);

  --scalar-sidebar-indent-border: var(--scalar-border-color);
  --scalar-sidebar-indent-border-hover: var(--scalar-color-3);
  --scalar-sidebar-indent-border-active: var(--scalar-color-1);

  --scalar-sidebar-search-background: var(--scalar-background-2);
  --scalar-sidebar-search-color: var(--scalar-color-3);
  --scalar-sidebar-search-border-color: var(--scalar-border-color);

  --scalar-tooltip-background: var(--scalar-color-1);
  --scalar-tooltip-color: var(--scalar-background-1);

  --scalar-color-alert: var(--scalar-color-orange);
  --scalar-color-danger: var(--scalar-color-red);
  --scalar-background-alert: color-mix(in oklch, var(--scalar-color-orange), var(--scalar-background-1) 92%);
  --scalar-background-danger: color-mix(in oklch, var(--scalar-color-red), var(--scalar-background-1) 92%);
}`;
//#endregion
export { scalar };

//# sourceMappingURL=index.js.map