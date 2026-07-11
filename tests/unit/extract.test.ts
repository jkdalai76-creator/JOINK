import { describe, expect, it } from "vitest";
import { extractFromHtml } from "@/lib/scraper/extract";
import type { ExtractionOptions } from "@/lib/types";

const ALL: ExtractionOptions = { metadata: true, headings: true, mainText: true, links: true };

const HTML = `<!doctype html>
<html><head>
  <title>  Test   Page </title>
  <meta name="description" content="A test description.">
  <script>document.title = "hacked"</script>
</head><body>
  <h1>Main Title</h1>
  <p>${"Intro paragraph with plenty of words to count as real content. ".repeat(10)}</p>
  <h2>Section One</h2>
  <h3>Subsection A</h3>
  <h2>Section Two</h2>
  <a href="/relative/path">Relative link</a>
  <a href="/relative/path">Duplicate relative link</a>
  <a href="https://other.example.org/page">External link</a>
  <a href="mailto:someone@example.com">Mail link</a>
  <a href="javascript:alert(1)">Bad link</a>
  <a href="https://sub.example.com/deep">Subdomain link</a>
</body></html>`;

describe("extractFromHtml", () => {
  const result = extractFromHtml(HTML, "https://example.com/base", ALL);

  it("extracts and cleans title and meta description", () => {
    expect(result.pageTitle).toBe("Test Page");
    expect(result.metaDescription).toBe("A test description.");
  });

  it("extracts H1–H3 with levels, order and section hints", () => {
    expect(result.headings.map((h) => [h.level, h.text])).toEqual([
      [1, "Main Title"],
      [2, "Section One"],
      [3, "Subsection A"],
      [2, "Section Two"],
    ]);
    expect(result.headings[1].section_hint).toBe("Main Title");
    expect(result.headings[2].section_hint).toBe("Section One");
  });

  it("converts relative links to absolute URLs", () => {
    expect(result.links.some((l) => l.url === "https://example.com/relative/path")).toBe(true);
  });

  it("deduplicates links by absolute URL", () => {
    const relatives = result.links.filter((l) => l.url === "https://example.com/relative/path");
    expect(relatives).toHaveLength(1);
  });

  it("drops non-http(s) links", () => {
    expect(result.links.every((l) => l.url.startsWith("http"))).toBe(true);
    expect(result.links.some((l) => l.url.startsWith("mailto:"))).toBe(false);
  });

  it("classifies internal vs external including subdomains", () => {
    const internal = result.links.find((l) => l.url === "https://example.com/relative/path");
    const sub = result.links.find((l) => l.url === "https://sub.example.com/deep");
    const external = result.links.find((l) => l.url === "https://other.example.org/page");
    expect(internal?.is_internal).toBe(true);
    expect(sub?.is_internal).toBe(true);
    expect(external?.is_internal).toBe(false);
  });

  it("extracts main text without executing or keeping scripts", () => {
    expect(result.mainText).toBeTruthy();
    expect(result.mainText).toContain("Intro paragraph");
    expect(result.mainText).not.toContain("hacked");
    expect(result.pageTitle).not.toContain("hacked");
  });

  it("respects disabled options", () => {
    const bare = extractFromHtml(HTML, "https://example.com", {
      metadata: false, headings: false, mainText: false, links: false,
    });
    expect(bare.pageTitle).toBeNull();
    expect(bare.headings).toHaveLength(0);
    expect(bare.links).toHaveLength(0);
    expect(bare.mainText).toBeNull();
  });
});
