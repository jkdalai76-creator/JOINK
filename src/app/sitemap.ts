import type { MetadataRoute } from "next";

// Set NEXT_PUBLIC_SITE_URL to your primary domain (e.g. https://jkarsu.com);
// falls back to the Vercel URL until then.
const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://joink-bice.vercel.app";

/** Public, indexable pages only — signed-in app surfaces stay out. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const paths = ["", "/pricing", "/guide", "/explore", "/sign-in", "/sign-up"];
  return paths.map((path) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.6,
  }));
}
