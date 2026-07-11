import { describe, expect, it } from "vitest";
import { chunkPages, retrieveChunks } from "@/lib/chat/chunks";
import { interpretModelReply } from "@/lib/chat/grounded";
import type { ScrapedPage } from "@/lib/types";

function page(id: string, title: string, text: string): ScrapedPage {
  return {
    id,
    scrape_run_id: "run1",
    project_id: "proj1",
    user_id: "user1",
    requested_url: `https://example.com/${id}`,
    final_url: `https://example.com/${id}`,
    page_title: title,
    meta_description: null,
    main_text: text,
    http_status: 200,
    content_type: "text/html",
    extraction_method: "http",
    extraction_status: "completed",
    confidence: "high",
    error_message: null,
    scraped_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
}

describe("chunkPages", () => {
  it("splits long text into bounded chunks carrying source metadata", () => {
    const long = "The quick brown fox jumps over the lazy dog. ".repeat(200);
    const chunks = chunkPages([page("p1", "Foxes", long)]);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(1300);
      expect(chunk.scraped_page_id).toBe("p1");
      expect(chunk.source_url).toBe("https://example.com/p1");
    }
  });

  it("skips pages with no text", () => {
    expect(chunkPages([page("p1", "Empty", "")])).toHaveLength(0);
  });
});

describe("retrieveChunks", () => {
  const chunks = chunkPages([
    page("p1", "Solar power", "Solar panels convert sunlight into electricity using photovoltaic cells."),
    page("p2", "Wind power", "Wind turbines generate electricity from moving air across blades."),
  ]);

  it("ranks topically relevant chunks first", () => {
    const hits = retrieveChunks(chunks, "How do solar panels work?");
    expect(hits[0].scraped_page_id).toBe("p1");
  });

  it("returns nothing relevant for unrelated queries", () => {
    const hits = retrieveChunks(chunks, "cryptocurrency blockchain zebra");
    expect(hits).toHaveLength(0);
  });
});

describe("interpretModelReply (citation validation)", () => {
  const supplied = chunkPages([
    page("p1", "Solar power", "Solar panels convert sunlight into electricity."),
  ]);
  const validId = supplied[0].id;

  it("keeps citations whose chunk ids were actually supplied", () => {
    const reply = JSON.stringify({ answer: "Panels convert sunlight.", citations: [validId], insufficient: false });
    const out = interpretModelReply(reply, supplied);
    expect(out.citations).toHaveLength(1);
    expect(out.citations[0].scraped_page_id).toBe("p1");
    expect(out.citations[0].source_url).toBe("https://example.com/p1");
  });

  it("drops hallucinated citation ids", () => {
    const reply = JSON.stringify({
      answer: "Answer.",
      citations: ["totally-made-up", 42, null, validId],
      insufficient: false,
    });
    const out = interpretModelReply(reply, supplied);
    expect(out.citations).toHaveLength(1);
  });

  it("propagates the insufficient-evidence signal without citations", () => {
    const reply = JSON.stringify({ answer: "Not enough info.", citations: [validId], insufficient: true });
    const out = interpretModelReply(reply, supplied);
    expect(out.insufficient).toBe(true);
    expect(out.citations).toHaveLength(0);
  });

  it("degrades gracefully on non-JSON replies", () => {
    const out = interpretModelReply("plain text answer", supplied);
    expect(out.answer).toBe("plain text answer");
    expect(out.citations).toHaveLength(0);
  });
});
