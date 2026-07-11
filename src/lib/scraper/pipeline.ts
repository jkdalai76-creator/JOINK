import type { DataStore } from "@/lib/store/types";
import type { ExtractionOptions, ScrapeRun, ScrapedPage } from "@/lib/types";
import { browserFallbackEnabled } from "@/lib/env";
import { FetchPageError, safeFetchPage } from "./fetcher";
import { extractFromHtml } from "./extract";
import { robotsAllows } from "./robots";
import { normalizeUrl, UnsafeUrlError } from "./url-safety";

export const MAX_URLS_PER_RUN = 10;
const CONCURRENCY = 3;

/**
 * Processes every queued page of a run, updating per-page and run status as
 * it goes so the progress screen can poll live state. One failed URL never
 * discards the successful ones (partial results are first-class).
 */
export async function processRun(
  store: DataStore,
  run: ScrapeRun,
  pages: ScrapedPage[],
  options: ExtractionOptions,
): Promise<void> {
  let completed = 0;
  let failed = 0;

  const queue = [...pages];
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    for (;;) {
      const page = queue.shift();
      if (!page) return;
      const outcome = await processPage(store, page, options);
      if (outcome === "failed") failed++;
      else completed++;
      await store.updateRun(run.id, {
        completed_url_count: completed,
        failed_url_count: failed,
        status: "running",
      });
    }
  });
  await Promise.all(workers);

  const finalStatus =
    failed === 0 ? "completed" : completed === 0 ? "failed" : "partial";
  await store.updateRun(run.id, {
    status: finalStatus,
    completed_url_count: completed,
    failed_url_count: failed,
    completed_at: new Date().toISOString(),
  });

  // Usage is counted per attempted URL; the run id makes retries idempotent.
  await store.incrementUsage(
    run.user_id,
    { urls_processed: pages.length },
    `run:${run.id}:urls`,
  );
}

type PageOutcome = "completed" | "partial" | "failed";

async function processPage(
  store: DataStore,
  page: ScrapedPage,
  options: ExtractionOptions,
): Promise<PageOutcome> {
  await store.updatePage(page.id, { extraction_status: "processing" });

  try {
    const url = normalizeUrl(page.requested_url);

    if (!(await robotsAllows(url))) {
      await store.updatePage(page.id, {
        extraction_status: "failed",
        confidence: "low",
        error_message: "Blocked by the site's robots.txt.",
        scraped_at: new Date().toISOString(),
      });
      return "failed";
    }

    let fetched = await safeFetchPage(url.toString());
    let method: ScrapedPage["extraction_method"] = "http";

    let result = extractFromHtml(fetched.body, fetched.finalUrl, options);

    // Optional Playwright fallback for JS-rendered pages (off by default).
    if (
      browserFallbackEnabled() &&
      options.mainText &&
      (!result.mainText || result.mainText.length < 200)
    ) {
      const rendered = await tryBrowserRender(fetched.finalUrl);
      if (rendered) {
        method = "browser";
        result = extractFromHtml(rendered, fetched.finalUrl, options);
      }
    }

    const gotAnything =
      result.pageTitle || result.metaDescription || result.mainText ||
      result.headings.length || result.links.length;

    const partial =
      options.mainText && (!result.mainText || result.mainText.length < 200);

    await store.updatePage(page.id, {
      final_url: fetched.finalUrl,
      page_title: result.pageTitle,
      meta_description: result.metaDescription,
      main_text: result.mainText,
      http_status: fetched.httpStatus,
      content_type: fetched.contentType,
      extraction_method: method,
      extraction_status: gotAnything ? (partial ? "partial" : "completed") : "partial",
      confidence: result.confidence,
      error_message: gotAnything
        ? partial
          ? "Main text was thin — the page may rely on JavaScript rendering."
          : null
        : "The page returned no extractable content.",
      scraped_at: new Date().toISOString(),
    });

    if (result.headings.length) {
      await store.insertHeadings(
        result.headings.map((h) => ({ ...h, scraped_page_id: page.id })),
      );
    }
    if (result.links.length) {
      await store.insertLinks(
        result.links.map((l) => ({ ...l, scraped_page_id: page.id })),
      );
    }
    return gotAnything ? (partial ? "partial" : "completed") : "partial";
  } catch (err) {
    const message =
      err instanceof UnsafeUrlError || err instanceof FetchPageError
        ? err.message
        : "Unexpected error while extracting this page.";
    const httpStatus = err instanceof FetchPageError ? err.httpStatus : null;
    await store.updatePage(page.id, {
      extraction_status: "failed",
      confidence: "low",
      http_status: httpStatus,
      error_message: message,
      scraped_at: new Date().toISOString(),
    });
    return "failed";
  }
}

/** Optional, best-effort JS rendering. Never throws; returns null if unavailable. */
async function tryBrowserRender(url: string): Promise<string | null> {
  try {
    const { chromium } = (await import("playwright-core")) as {
      chromium: {
        launch(opts?: object): Promise<{
          newPage(): Promise<{
            goto(u: string, o?: object): Promise<unknown>;
            content(): Promise<string>;
          }>;
          close(): Promise<void>;
        }>;
      };
    };
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "networkidle", timeout: 15_000 });
      return await page.content();
    } finally {
      await browser.close();
    }
  } catch {
    return null;
  }
}
