import { NextResponse } from "next/server";
import { errors, fail, handle } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { checkCsvExport, snapshot } from "@/lib/billing/entitlements";
import { toCsv } from "@/lib/export/csv";
import { getStore } from "@/lib/store";

type Params = { params: Promise<{ id: string }> };

/** GET /api/runs/:id/export?format=json|csv — always includes sources + timestamps. */
export async function GET(req: Request, { params }: Params) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw errors.unauthorized();
    const { id } = await params;
    const format = new URL(req.url).searchParams.get("format") ?? "json";
    if (format !== "json" && format !== "csv") {
      return fail("invalid_format", "format must be json or csv.", 400);
    }

    const store = await getStore();
    const run = await store.getRun(user.id, id);
    if (!run) throw errors.notFound("Extraction run");

    if (format === "csv") {
      const decision = checkCsvExport(await snapshot(store, user.id));
      if (!decision.allowed) return fail("limit_reached", decision.reason!, 402);
    }

    const [project, pages, headings, links] = await Promise.all([
      store.getProject(user.id, run.project_id),
      store.listPagesByRun(user.id, id),
      store.listHeadingsByRun(user.id, id),
      store.listLinksByRun(user.id, id),
    ]);

    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

    if (format === "json") {
      const payload = {
        exported_at: new Date().toISOString(),
        project: project ? { id: project.id, name: project.name } : null,
        run: {
          id: run.id,
          status: run.status,
          created_at: run.created_at,
          completed_at: run.completed_at,
          extraction_options: run.extraction_options,
        },
        pages: pages.map((p) => ({
          id: p.id,
          requested_url: p.requested_url,
          final_url: p.final_url,
          page_title: p.page_title,
          meta_description: p.meta_description,
          main_text: p.main_text,
          http_status: p.http_status,
          content_type: p.content_type,
          extraction_method: p.extraction_method,
          extraction_status: p.extraction_status,
          confidence: p.confidence,
          error_message: p.error_message,
          scraped_at: p.scraped_at,
          headings: headings
            .filter((h) => h.scraped_page_id === p.id)
            .map((h) => ({ level: h.level, text: h.text, section_hint: h.section_hint })),
          links: links
            .filter((l) => l.scraped_page_id === p.id)
            .map((l) => ({ anchor_text: l.anchor_text, url: l.url, is_internal: l.is_internal })),
        })),
      };
      return new NextResponse(JSON.stringify(payload, null, 2), {
        headers: {
          "content-type": "application/json",
          "content-disposition": `attachment; filename="joink-run-${stamp}.json"`,
        },
      });
    }

    const pageBysId = new Map(pages.map((p) => [p.id, p]));
    const rows: unknown[][] = [];
    for (const p of pages) {
      rows.push([
        "page", p.final_url ?? p.requested_url, p.page_title ?? "", p.meta_description ?? "",
        p.extraction_status, p.confidence, p.scraped_at ?? "", "", "",
      ]);
    }
    for (const h of headings) {
      const p = pageBysId.get(h.scraped_page_id);
      rows.push([
        `h${h.level}`, p?.final_url ?? p?.requested_url ?? "", h.text, "",
        "", "", p?.scraped_at ?? "", h.section_hint ?? "", "",
      ]);
    }
    for (const l of links) {
      const p = pageBysId.get(l.scraped_page_id);
      rows.push([
        "link", p?.final_url ?? p?.requested_url ?? "", l.anchor_text, "",
        "", "", p?.scraped_at ?? "", "", l.url,
      ]);
    }
    const csv = toCsv(
      ["type", "source_url", "text", "description", "status", "confidence", "scraped_at", "section", "link_url"],
      rows,
    );
    return new NextResponse(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="joink-run-${stamp}.csv"`,
      },
    });
  });
}
