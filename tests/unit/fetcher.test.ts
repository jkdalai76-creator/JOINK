import { describe, expect, it } from "vitest";
import { FetchPageError, isAllowedContentType, readBodyWithLimit } from "@/lib/scraper/fetcher";

describe("isAllowedContentType", () => {
  it("accepts html/xhtml/plain text", () => {
    expect(isAllowedContentType("text/html")).toBe(true);
    expect(isAllowedContentType("text/html; charset=utf-8")).toBe(true);
    expect(isAllowedContentType("application/xhtml+xml")).toBe(true);
    expect(isAllowedContentType("text/plain")).toBe(true);
  });

  it("rejects binary and script types", () => {
    expect(isAllowedContentType("application/pdf")).toBe(false);
    expect(isAllowedContentType("image/png")).toBe(false);
    expect(isAllowedContentType("application/octet-stream")).toBe(false);
    expect(isAllowedContentType("")).toBe(false);
  });
});

describe("readBodyWithLimit", () => {
  it("reads bodies under the limit", async () => {
    const res = new Response("hello world");
    await expect(readBodyWithLimit(res, 1024)).resolves.toBe("hello world");
  });

  it("throws when the streamed body exceeds the limit", async () => {
    const big = "x".repeat(2048);
    const res = new Response(big);
    await expect(readBodyWithLimit(res, 1024)).rejects.toThrow(FetchPageError);
  });

  it("rejects early via content-length", async () => {
    const res = new Response("tiny", { headers: { "content-length": String(10_000_000) } });
    await expect(readBodyWithLimit(res, 1024)).rejects.toThrow(/limit/i);
  });
});
