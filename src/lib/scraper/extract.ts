import * as cheerio from "cheerio";
import type { Confidence, ExtractionOptions } from "@/lib/types";

export interface ExtractedHeading {
  level: 1 | 2 | 3;
  text: string;
  position_index: number;
  section_hint: string | null;
}

export interface ExtractedLinkItem {
  anchor_text: string;
  url: string;
  is_internal: boolean;
  position_index: number;
}

export interface ExtractionResult {
  pageTitle: string | null;
  metaDescription: string | null;
  headings: ExtractedHeading[];
  mainText: string | null;
  links: ExtractedLinkItem[];
  confidence: Confidence;
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Extracts structured content from raw HTML. Everything returned here is
 * PLAIN TEXT — scripts and markup are never preserved, so scraped pages can
 * never execute in the app, and their content is treated purely as data.
 */
export function extractFromHtml(
  html: string,
  baseUrl: string,
  options: ExtractionOptions,
): ExtractionResult {
  const $ = cheerio.load(html);
  $("script, style, noscript, template, iframe").remove();

  const pageTitle = options.metadata
    ? cleanText(
        $("title").first().text() || $('meta[property="og:title"]').attr("content") || "",
      ) || null
    : null;

  const metaDescription = options.metadata
    ? cleanText(
        $('meta[name="description"]').attr("content") ||
          $('meta[property="og:description"]').attr("content") ||
          "",
      ) || null
    : null;

  const headings: ExtractedHeading[] = [];
  if (options.headings) {
    let lastH1: string | null = null;
    let lastH2: string | null = null;
    let index = 0;
    $("h1, h2, h3").each((_, el) => {
      const tag = el.tagName?.toLowerCase();
      const text = cleanText($(el).text());
      if (!text || text.length > 500) return;
      const level = (tag === "h1" ? 1 : tag === "h2" ? 2 : 3) as 1 | 2 | 3;
      let sectionHint: string | null = null;
      if (level === 2) sectionHint = lastH1;
      if (level === 3) sectionHint = lastH2 ?? lastH1;
      if (level === 1) lastH1 = text;
      if (level === 2) lastH2 = text;
      headings.push({ level, text, position_index: index++, section_hint: sectionHint });
    });
  }

  const links: ExtractedLinkItem[] = [];
  if (options.links) {
    const seen = new Set<string>();
    let baseHost = "";
    try {
      baseHost = new URL(baseUrl).hostname.toLowerCase();
    } catch {
      /* keep empty */
    }
    let index = 0;
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      let absolute: URL;
      try {
        absolute = new URL(href, baseUrl);
      } catch {
        return;
      }
      if (absolute.protocol !== "http:" && absolute.protocol !== "https:") return;
      absolute.hash = "";
      const urlString = absolute.toString();
      if (seen.has(urlString)) return; // deduplicate by absolute URL
      seen.add(urlString);
      const host = absolute.hostname.toLowerCase();
      const isInternal =
        Boolean(baseHost) && (host === baseHost || host.endsWith(`.${baseHost}`));
      links.push({
        anchor_text: cleanText($(el).text()).slice(0, 300),
        url: urlString,
        is_internal: isInternal,
        position_index: index++,
      });
    });
  }

  let mainText: string | null = null;
  let confidence: Confidence = "medium";
  if (options.mainText) {
    const readable = extractReadableText(html, baseUrl);
    if (readable && readable.length >= 400) {
      mainText = readable;
      confidence = "high";
    } else {
      mainText = extractFallbackText($) || readable || null;
      confidence = mainText && mainText.length >= 200 ? "medium" : "low";
    }
    if (mainText) mainText = mainText.slice(0, 200_000);
  } else if (pageTitle || headings.length || links.length) {
    confidence = "medium";
  }

  return { pageTitle, metaDescription, headings, mainText, links, confidence };
}

/** Mozilla Readability via jsdom (scripts never execute — default jsdom). */
function extractReadableText(html: string, baseUrl: string): string | null {
  try {
    // Lazy require keeps jsdom out of any client bundle.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { JSDOM } = require("jsdom") as typeof import("jsdom");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Readability } = require("@mozilla/readability") as typeof import("@mozilla/readability");
    const dom = new JSDOM(html, { url: baseUrl });
    const article = new Readability(dom.window.document).parse();
    const text = article?.textContent ? cleanParagraphs(article.textContent) : null;
    dom.window.close();
    return text;
  } catch {
    return null;
  }
}

/** Cheerio fallback: text of <article>/<main>, else all paragraphs. */
function extractFallbackText($: cheerio.CheerioAPI): string | null {
  const scopes = ["article", "main", '[role="main"]', "body"];
  for (const scope of scopes) {
    const root = $(scope).first();
    if (!root.length) continue;
    const paragraphs: string[] = [];
    root.find("p, li").each((_, el) => {
      const text = cleanText($(el).text());
      if (text.length >= 40) paragraphs.push(text);
    });
    if (paragraphs.length) return paragraphs.join("\n\n");
    const raw = cleanParagraphs(root.text());
    if (raw && raw.length >= 200) return raw;
  }
  return null;
}

function cleanParagraphs(text: string): string {
  return text
    .split(/\n{2,}|\r\n{2,}/)
    .map((p) => cleanText(p))
    .filter(Boolean)
    .join("\n\n")
    .trim();
}
