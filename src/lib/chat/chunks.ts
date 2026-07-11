import type { ScrapedPage } from "@/lib/types";

export interface ContextChunk {
  id: string; // "<pageIndex>-<chunkIndex>", stable within one request
  scraped_page_id: string;
  page_title: string;
  source_url: string;
  text: string;
}

const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 150;

/** Splits saved extraction text into bounded, citable chunks. */
export function chunkPages(pages: ScrapedPage[]): ContextChunk[] {
  const chunks: ContextChunk[] = [];
  pages.forEach((page, pageIndex) => {
    const title = page.page_title ?? page.requested_url;
    const url = page.final_url ?? page.requested_url;
    const source = [
      page.meta_description ? `Description: ${page.meta_description}` : "",
      page.main_text ?? "",
    ]
      .filter(Boolean)
      .join("\n\n");
    if (!source.trim()) return;

    let start = 0;
    let chunkIndex = 0;
    while (start < source.length) {
      let end = Math.min(start + CHUNK_SIZE, source.length);
      // Prefer breaking on a sentence/paragraph boundary near the end.
      if (end < source.length) {
        const slice = source.slice(start, end);
        const breakAt = Math.max(slice.lastIndexOf("\n\n"), slice.lastIndexOf(". "));
        if (breakAt > CHUNK_SIZE * 0.5) end = start + breakAt + 1;
      }
      const text = source.slice(start, end).trim();
      if (text) {
        chunks.push({
          id: `${pageIndex}-${chunkIndex}`,
          scraped_page_id: page.id,
          page_title: title,
          source_url: url,
          text,
        });
        chunkIndex++;
      }
      if (end >= source.length) break;
      start = end - CHUNK_OVERLAP;
    }
  });
  return chunks;
}

const STOP_WORDS = new Set(
  "a an and are as at be by for from has have how i in is it its of on or that the this to was what when where which who will with you your".split(
    " ",
  ),
);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

/**
 * Simple lexical retrieval: score chunks by query-term overlap (with a boost
 * for title matches) and return the best few. Works identically in demo and
 * Supabase modes; Postgres FTS indexes exist for future server-side search.
 */
export function retrieveChunks(
  chunks: ContextChunk[],
  question: string,
  limit = 6,
): ContextChunk[] {
  const terms = tokenize(question);
  if (!terms.length) return chunks.slice(0, limit);
  const scored = chunks.map((chunk) => {
    const haystack = chunk.text.toLowerCase();
    const titleHaystack = chunk.page_title.toLowerCase();
    let score = 0;
    for (const term of terms) {
      const bodyHits = haystack.split(term).length - 1;
      score += Math.min(bodyHits, 5);
      if (titleHaystack.includes(term)) score += 2;
    }
    return { chunk, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.chunk);
}
