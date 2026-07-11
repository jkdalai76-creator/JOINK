import { assertSafeUrl, normalizeUrl, UnsafeUrlError } from "./url-safety";

export const USER_AGENT =
  "JoinkBot/0.1 (+https://joink.app/responsible-scraping; content research tool)";

export const FETCH_LIMITS = {
  timeoutMs: 12_000,
  maxRedirects: 5,
  maxBodyBytes: 2 * 1024 * 1024, // 2 MiB
};

const ALLOWED_CONTENT_TYPES = [
  "text/html",
  "application/xhtml+xml",
  "text/plain",
  "application/xml",
  "text/xml",
];

export class FetchPageError extends Error {
  constructor(
    message: string,
    public httpStatus: number | null = null,
  ) {
    super(message);
    this.name = "FetchPageError";
  }
}

export interface FetchedPage {
  finalUrl: string;
  httpStatus: number;
  contentType: string;
  body: string;
}

export function isAllowedContentType(contentType: string): boolean {
  const base = contentType.split(";")[0].trim().toLowerCase();
  return ALLOWED_CONTENT_TYPES.includes(base);
}

/** Reads a response body enforcing the byte cap; throws when exceeded. */
export async function readBodyWithLimit(res: Response, maxBytes: number): Promise<string> {
  const lengthHeader = res.headers.get("content-length");
  if (lengthHeader && Number(lengthHeader) > maxBytes) {
    throw new FetchPageError(
      `Page is larger than the ${Math.round(maxBytes / 1024 / 1024)} MiB limit.`,
      res.status,
    );
  }
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new FetchPageError(
        `Page exceeded the ${Math.round(maxBytes / 1024 / 1024)} MiB response-size limit.`,
        res.status,
      );
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(merged);
}

/**
 * Fetches a page with full SSRF protection: every redirect hop is
 * re-validated, redirects are capped, responses are size- and time-limited,
 * and only text-like content types are accepted.
 */
export async function safeFetchPage(inputUrl: string): Promise<FetchedPage> {
  let current = await assertSafeUrl(normalizeUrl(inputUrl));

  for (let hop = 0; hop <= FETCH_LIMITS.maxRedirects; hop++) {
    let res: Response;
    try {
      res = await fetch(current.toString(), {
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_LIMITS.timeoutMs),
        headers: {
          "user-agent": USER_AGENT,
          accept: "text/html,application/xhtml+xml;q=0.9,text/plain;q=0.8,*/*;q=0.1",
          "accept-language": "en",
        },
      });
    } catch (err) {
      if (err instanceof Error && err.name === "TimeoutError") {
        throw new FetchPageError(`Timed out after ${FETCH_LIMITS.timeoutMs / 1000}s.`);
      }
      throw new FetchPageError("Could not connect to the site.");
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      res.body?.cancel().catch(() => {});
      if (!location) throw new FetchPageError("Redirect without a destination.", res.status);
      if (hop === FETCH_LIMITS.maxRedirects) {
        throw new FetchPageError(
          `Too many redirects (limit ${FETCH_LIMITS.maxRedirects}).`,
          res.status,
        );
      }
      let next: URL;
      try {
        next = new URL(location, current);
      } catch {
        throw new FetchPageError("Redirect points to an invalid URL.", res.status);
      }
      // Every redirect destination goes through the same safety gate.
      try {
        current = await assertSafeUrl(normalizeUrl(next.toString()));
      } catch (err) {
        if (err instanceof UnsafeUrlError) {
          throw new FetchPageError(`Redirect blocked: ${err.message}`, res.status);
        }
        throw err;
      }
      continue;
    }

    if (!res.ok) {
      res.body?.cancel().catch(() => {});
      throw new FetchPageError(`The site responded with HTTP ${res.status}.`, res.status);
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!isAllowedContentType(contentType)) {
      res.body?.cancel().catch(() => {});
      throw new FetchPageError(
        `Unsupported content type "${contentType.split(";")[0] || "unknown"}" — only HTML and text pages can be extracted.`,
        res.status,
      );
    }

    const body = await readBodyWithLimit(res, FETCH_LIMITS.maxBodyBytes);
    return {
      finalUrl: current.toString(),
      httpStatus: res.status,
      contentType: contentType.split(";")[0].trim(),
      body,
    };
  }

  throw new FetchPageError("Too many redirects.");
}
