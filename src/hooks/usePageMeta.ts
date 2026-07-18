import { useEffect } from "react";
import {
  SITE,
  absoluteUrl,
  buildJsonLdGraph,
  getPageSeo,
  type SeoPageInput,
} from "../lib/seo";

function upsertMeta(selector: string, attrs: Record<string, string>, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v);
    }
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string, extra: Record<string, string> = {}) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
  for (const [k, v] of Object.entries(extra)) {
    el.setAttribute(k, v);
  }
}

function upsertJsonLd(id: string, data: unknown) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export type PageMetaOptions = {
  /** Pathname for canonical / OG url (defaults to current location). */
  path?: string;
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  keywords?: string;
  robots?: string;
  image?: string;
  ogType?: string;
  /** Extra JSON-LD nodes appended to the page graph. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

/**
 * Full technical SEO head updates for SPA routes:
 * title, description, robots, canonical, Open Graph, Twitter, JSON-LD.
 */
export function usePageMeta(
  titleOrOptions: string | PageMetaOptions,
  descriptionArg?: string
) {
  useEffect(() => {
    const path =
      (typeof titleOrOptions === "object" && titleOrOptions.path) ||
      window.location.pathname ||
      "/";
    const fromMap = getPageSeo(path);

    const opts: PageMetaOptions & Partial<SeoPageInput> =
      typeof titleOrOptions === "string"
        ? {
            ...fromMap,
            path,
            title: titleOrOptions,
            description: descriptionArg || fromMap?.description || "",
          }
        : { ...fromMap, ...titleOrOptions, path };

    const title = opts.title || fromMap?.title || SITE.name;
    const description = opts.description || fromMap?.description || "";
    const ogTitle = opts.ogTitle || fromMap?.ogTitle || title;
    const ogDescription = opts.ogDescription || fromMap?.ogDescription || description;
    const robots = opts.robots || fromMap?.robots || "index, follow";
    const image = opts.image || SITE.ogImage;
    const ogType = opts.ogType || fromMap?.ogType || "website";
    const canonical = absoluteUrl(path);
    const keywords = opts.keywords || fromMap?.keywords;

    document.title = title;
    document.documentElement.lang = SITE.lang;

    upsertMeta('meta[name="description"]', { name: "description" }, description);
    upsertMeta('meta[name="robots"]', { name: "robots" }, robots);
    upsertMeta('meta[name="googlebot"]', { name: "googlebot" }, robots);
    if (keywords) {
      upsertMeta('meta[name="keywords"]', { name: "keywords" }, keywords);
    }

    upsertLink("canonical", canonical);

    upsertMeta('meta[property="og:type"]', { property: "og:type" }, ogType);
    upsertMeta('meta[property="og:site_name"]', { property: "og:site_name" }, SITE.name);
    upsertMeta('meta[property="og:locale"]', { property: "og:locale" }, SITE.locale);
    upsertMeta('meta[property="og:title"]', { property: "og:title" }, ogTitle);
    upsertMeta('meta[property="og:description"]', { property: "og:description" }, ogDescription);
    upsertMeta('meta[property="og:url"]', { property: "og:url" }, canonical);
    upsertMeta('meta[property="og:image"]', { property: "og:image" }, image);
    upsertMeta(
      'meta[property="og:image:secure_url"]',
      { property: "og:image:secure_url" },
      image
    );
    upsertMeta(
      'meta[property="og:image:width"]',
      { property: "og:image:width" },
      String(SITE.ogImageWidth)
    );
    upsertMeta(
      'meta[property="og:image:height"]',
      { property: "og:image:height" },
      String(SITE.ogImageHeight)
    );
    upsertMeta('meta[property="og:image:alt"]', { property: "og:image:alt" }, ogTitle);

    upsertMeta('meta[name="twitter:card"]', { name: "twitter:card" }, "summary_large_image");
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title" }, ogTitle);
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description" }, ogDescription);
    upsertMeta('meta[name="twitter:image"]', { name: "twitter:image" }, image);
    upsertMeta('meta[name="twitter:image:alt"]', { name: "twitter:image:alt" }, ogTitle);

    const graph = buildJsonLdGraph(path);
    if (opts.jsonLd) {
      const extra = Array.isArray(opts.jsonLd) ? opts.jsonLd : [opts.jsonLd];
      graph.push(...extra);
    }
    upsertJsonLd("seo-jsonld", {
      "@context": "https://schema.org",
      "@graph": graph.map(({ "@context": _c, ...rest }) => rest),
    });
  }, [
    typeof titleOrOptions === "string" ? titleOrOptions : JSON.stringify(titleOrOptions),
    descriptionArg,
  ]);
}

/** Convenience: apply SEO from the shared page map for the given path. */
export function useRouteSeo(path: string, overrides?: PageMetaOptions) {
  usePageMeta({ path, ...overrides });
}
