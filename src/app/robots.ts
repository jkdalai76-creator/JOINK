import type { MetadataRoute } from "next";

/**
 * Let crawlers index the public marketing pages, but keep the API and the
 * signed-in app surfaces out of search results.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard",
        "/projects/",
        "/runs/",
        "/billing",
        "/reset-password",
        "/forgot-password",
      ],
    },
  };
}
