// Inject per-route SEO into the SPA shell for crawlers & social previews.
import {
  SITE,
  absoluteUrl,
  getPageSeo,
  buildJsonLdGraph,
  buildSitemapXml,
} from "../shared/seo.mjs";

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Rewrite title/meta/canonical/JSON-LD in index.html for the requested path.
 * @param {string} html
 * @param {string} pathname
 */
export function injectSeoIntoHtml(html, pathname) {
  const page = getPageSeo(pathname);
  const is404 = !page && pathname !== "/";
  const title = is404
    ? `Page Not Found | ${SITE.name}`
    : page?.title || `${SITE.name}`;
  const description = is404
    ? "That page isn’t on the menu. Head back to Diner Grill’s home, menu, or visit page."
    : page?.description || "";
  const ogTitle = is404 ? title : page?.ogTitle || title;
  const ogDescription = is404 ? description : page?.ogDescription || description;
  const robots = is404 ? "noindex, follow" : page?.robots || "index, follow";
  const canonical = is404 ? absoluteUrl("/") : absoluteUrl(page?.path || "/");
  const image = SITE.ogImage;
  const ogType = page?.ogType || "website";
  const keywords = page?.keywords || "";

  let out = html;

  out = out.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`);

  const replaceMetaName = (name, content) => {
    const re = new RegExp(`<meta\\s+name="${name}"\\s+content="[^"]*"\\s*/?>`, "i");
    const tag = `<meta name="${name}" content="${escapeAttr(content)}" />`;
    if (re.test(out)) out = out.replace(re, tag);
    else out = out.replace("</head>", `    ${tag}\n  </head>`);
  };

  const replaceMetaProp = (property, content) => {
    const re = new RegExp(
      `<meta\\s+property="${property}"\\s+content="[^"]*"\\s*/?>`,
      "i"
    );
    const tag = `<meta property="${property}" content="${escapeAttr(content)}" />`;
    if (re.test(out)) out = out.replace(re, tag);
    else out = out.replace("</head>", `    ${tag}\n  </head>`);
  };

  replaceMetaName("description", description);
  replaceMetaName("robots", robots);
  replaceMetaName("googlebot", robots);
  if (keywords) replaceMetaName("keywords", keywords);

  out = out.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${escapeAttr(canonical)}" />`
  );

  replaceMetaProp("og:type", ogType);
  replaceMetaProp("og:title", ogTitle);
  replaceMetaProp("og:description", ogDescription);
  replaceMetaProp("og:url", canonical);
  replaceMetaProp("og:image", image);
  replaceMetaProp("og:image:secure_url", image);
  replaceMetaProp("og:image:alt", ogTitle);

  replaceMetaName("twitter:title", ogTitle);
  replaceMetaName("twitter:description", ogDescription);
  replaceMetaName("twitter:image", image);
  replaceMetaName("twitter:image:alt", ogTitle);

  const graphPath = is404 ? "/" : page?.path || "/";
  const graph = buildJsonLdGraph(graphPath);
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": graph.map(({ "@context": _c, ...rest }) => rest),
  });

  if (/<script[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/i.test(out)) {
    out = out.replace(
      /<script[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/i,
      `<script type="application/ld+json" id="seo-jsonld">${jsonLd}</script>`
    );
  } else {
    out = out.replace(
      "</head>",
      `    <script type="application/ld+json" id="seo-jsonld">${jsonLd}</script>\n  </head>`
    );
  }

  return out;
}

export { buildSitemapXml, SITE };
