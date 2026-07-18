/** Shared SEO helpers for Express (and optional Node scripts). */
import site from "./seo-site.json" with { type: "json" };
import pages from "./seo-pages.json" with { type: "json" };

export const SITE = site;
export const PAGES = pages;

export function absoluteUrl(pathname = "/") {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (path === "/") return `${SITE.url}/`;
  return `${SITE.url}${path.replace(/\/$/, "")}`;
}

export function getPageSeo(pathname) {
  const clean = pathname.split("?")[0].split("#")[0] || "/";
  const normalized = clean.length > 1 && clean.endsWith("/") ? clean.slice(0, -1) : clean;
  return PAGES.find((p) => p.path === normalized) ?? null;
}

export function sitemapPages() {
  return PAGES.filter((p) => p.inSitemap !== false && !String(p.robots || "").includes("noindex"));
}

export function restaurantJsonLd(extra = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": `${SITE.url}/#restaurant`,
    name: SITE.name,
    alternateName: "The Diner Grill",
    description:
      "Legendary 24-hour counter diner in Lakeview, Chicago. Home of the Slinger. Serving scratch-made American diner classics since 1937.",
    image: [SITE.ogImage],
    servesCuisine: ["American", "Diner", "Breakfast", "Burgers"],
    priceRange: "$",
    telephone: SITE.phone,
    url: `${SITE.url}/`,
    foundingDate: SITE.foundingDate,
    acceptsReservations: false,
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE.address.street,
      addressLocality: SITE.address.city,
      addressRegion: SITE.address.region,
      postalCode: SITE.address.postal,
      addressCountry: SITE.address.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: SITE.geo.latitude,
      longitude: SITE.geo.longitude,
    },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      opens: "00:00",
      closes: "23:59",
    },
    hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${SITE.address.street}, ${SITE.address.city}, ${SITE.address.region} ${SITE.address.postal}`
    )}`,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: SITE.ratingValue,
      reviewCount: SITE.reviewCount,
      bestRating: 5,
      worstRating: 1,
    },
    sameAs: [
      "https://www.google.com/maps/search/?api=1&query=Diner+Grill+1635+W+Irving+Park+Rd+Chicago+IL",
    ],
    ...extra,
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE.url}/#website`,
    name: SITE.name,
    url: `${SITE.url}/`,
    publisher: { "@id": `${SITE.url}/#restaurant` },
    inLanguage: SITE.lang,
  };
}

export function breadcrumbJsonLd(pathname) {
  const page = getPageSeo(pathname);
  const items = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: absoluteUrl("/"),
    },
  ];
  if (page && page.path !== "/") {
    items.push({
      "@type": "ListItem",
      position: 2,
      name: page.ogTitle?.split("|")[0]?.trim() || page.title.split("|")[0].trim(),
      item: absoluteUrl(page.path),
    });
  }
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

export function buildJsonLdGraph(pathname) {
  const graph = [restaurantJsonLd(), websiteJsonLd()];
  if (pathname && pathname !== "/") {
    graph.push(breadcrumbJsonLd(pathname));
  }
  if (pathname === "/menu") {
    graph.push({
      "@context": "https://schema.org",
      "@type": "Menu",
      "@id": `${SITE.url}/menu#menu`,
      name: "Diner Grill Menu",
      description:
        "All-day breakfast, omelettes, skillets, burgers, and the famous Slinger — served 24 hours.",
      hasMenuSection: [
        { "@type": "MenuSection", name: "Breakfast Classics" },
        { "@type": "MenuSection", name: "Omelettes" },
        { "@type": "MenuSection", name: "Skillets" },
        { "@type": "MenuSection", name: "Burgers & Sandwiches" },
        { "@type": "MenuSection", name: "The Slinger" },
      ],
      provider: { "@id": `${SITE.url}/#restaurant` },
      url: absoluteUrl("/menu"),
    });
  }
  if (pathname === "/visit") {
    const r = restaurantJsonLd();
    graph.push({
      "@context": "https://schema.org",
      "@type": "Place",
      "@id": `${SITE.url}/visit#place`,
      name: SITE.name,
      address: r.address,
      geo: r.geo,
      telephone: SITE.phone,
      url: absoluteUrl("/visit"),
    });
  }
  return graph;
}

export function buildSitemapXml(lastmod = new Date().toISOString().slice(0, 10)) {
  const urls = sitemapPages()
    .map((p) => {
      const loc = absoluteUrl(p.path);
      return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${p.changefreq || "monthly"}</changefreq>
    <priority>${Number(p.priority ?? 0.5).toFixed(1)}</priority>
  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}
