import { after } from "next/server";
import { z } from "zod";
import { errors, fail, handle, ok, parseBody } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { checkProcessUrls, snapshot } from "@/lib/billing/entitlements";
import { rateLimit } from "@/lib/rate-limit";
import { MAX_URLS_PER_RUN, processRun } from "@/lib/scraper/pipeline";
import { normalizeUrl, UnsafeUrlError } from "@/lib/scraper/url-safety";
import { getBackgroundStore, getStore } from "@/lib/store";
import type { ScrapedPage } from "@/lib/types";

const schema = z.object({
  projectId: z.string().min(1),
  urls: z.array(z.string().trim().min(1)).min(1, "Add at least one URL.").max(
    MAX_URLS_PER_RUN,
    `A run can include at most ${MAX_URLS_PER_RUN} URLs.`,
  ),
  options: z
    .object({
      metadata: z.boolean(),
      headings: z.boolean(),
      mainText: z.boolean(),
      links: z.boolean(),
    })
    .default({ metadata: true, headings: true, mainText: true, links: true }),
});

export async function POST(req: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw errors.unauthorized();
    const body = await parseBody(req, schema);

    if (!rateLimit(`scrape:${user.id}`, 5, 60_000)) {
      return fail("rate_limited", "Too many extraction runs. Please wait a minute.", 429);
    }

    const store = await getStore();
    const project = await store.getProject(user.id, body.projectId);
    if (!project) throw errors.notFound("Project");

    // Validate URL syntax up front so users get immediate, per-URL feedback.
    const urls: string[] = [];
    for (const raw of body.urls) {
      try {
        urls.push(normalizeUrl(raw).toString());
      } catch (err) {
        return fail(
          "invalid_url",
          err instanceof UnsafeUrlError ? err.message : `"${raw}" is not a valid URL.`,
          400,
        );
      }
    }
    const uniqueUrls = [...new Set(urls)];

    const decision = checkProcessUrls(await snapshot(store, user.id), uniqueUrls.length);
    if (!decision.allowed) return fail("limit_reached", decision.reason!, 402);

    const run = await store.createRun({
      project_id: project.id,
      user_id: user.id,
      status: "queued",
      requested_url_count: uniqueUrls.length,
      completed_url_count: 0,
      failed_url_count: 0,
      extraction_options: body.options,
    });

    const pages: ScrapedPage[] = [];
    for (const url of uniqueUrls) {
      pages.push(
        await store.createPage({
          scrape_run_id: run.id,
          project_id: project.id,
          user_id: user.id,
          requested_url: url,
          final_url: null,
          page_title: null,
          meta_description: null,
          main_text: null,
          http_status: null,
          content_type: null,
          extraction_method: "http",
          extraction_status: "queued",
          confidence: "medium",
          error_message: null,
          scraped_at: null,
        }),
      );
    }

    // Extraction continues after this response; the run page polls status.
    after(async () => {
      const bg = getBackgroundStore();
      try {
        await processRun(bg, run, pages, body.options);
      } catch (err) {
        console.error("[joink] run processing crashed:", err);
        await bg.updateRun(run.id, {
          status: "failed",
          completed_at: new Date().toISOString(),
        });
      }
    });

    return ok({ run }, { status: 202 });
  });
}
