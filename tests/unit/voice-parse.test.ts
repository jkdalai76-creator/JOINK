import { describe, expect, it } from "vitest";
import { parseVoiceRequest } from "@/lib/voice-parse";

describe("parseVoiceRequest", () => {
  it("extracts a spoken URL and a topic", () => {
    const r = parseVoiceRequest("Research electric cars from example dot com");
    expect(r.urls).toContain("https://example.com");
    expect(r.name.toLowerCase()).toContain("electric cars");
  });

  it("handles slashes and paths spoken aloud", () => {
    const r = parseVoiceRequest("scrape example dot com slash guides slash intro");
    expect(r.urls).toContain("https://example.com/guides/intro");
  });

  it("keeps existing scheme and www", () => {
    const r = parseVoiceRequest("get https://www.example.org/page");
    expect(r.urls).toContain("https://www.example.org/page");
  });

  it("extracts multiple websites and deduplicates", () => {
    const r = parseVoiceRequest("compare example dot com and test dot org and example dot com");
    expect(r.urls).toContain("https://example.com");
    expect(r.urls).toContain("https://test.org");
    expect(r.urls).toHaveLength(2);
  });

  it("returns no urls when none are spoken", () => {
    const r = parseVoiceRequest("I want to research renewable energy trends");
    expect(r.urls).toHaveLength(0);
    expect(r.name.toLowerCase()).toContain("renewable energy trends");
  });

  it("strips trailing punctuation from a URL", () => {
    const r = parseVoiceRequest("open example dot com.");
    expect(r.urls).toContain("https://example.com");
  });
});
