import { USER_AGENT } from "@/lib/scraper/fetcher";

/**
 * Discovery feeds (Reddit's public JSON API — no key required). Fetched
 * server-side with a descriptive user agent and cached in memory so the app
 * stays polite. Every item links back to its source, in keeping with Joink's
 * traceability story, and can be sent straight into an extraction run.
 */

export type FeedId = "news" | "popular" | "explore";

export interface FeedItem {
  id: string;
  title: string;
  url: string; // the linked article/page
  permalink: string; // reddit discussion
  subreddit: string;
  domain: string;
  score: number;
  num_comments: number;
  created_utc: number;
  thumbnail: string | null;
}

const FEED_SOURCES: Record<FeedId, { path: string; label: string }> = {
  news: { path: "/r/news+worldnews/top.json?t=day&limit=25", label: "Top news today" },
  popular: { path: "/r/popular/hot.json?limit=25", label: "Popular right now" },
  explore: {
    path: "/r/technology+science+space+programming+dataisbeautiful/hot.json?limit=25",
    label: "Explore tech & science",
  },
};

export function feedLabel(feed: FeedId): string {
  return FEED_SOURCES[feed].label;
}

export function isFeedId(value: string): value is FeedId {
  return value === "news" || value === "popular" || value === "explore";
}

interface RedditChild {
  data: {
    id: string;
    title: string;
    url?: string;
    url_overridden_by_dest?: string;
    permalink: string;
    subreddit_name_prefixed: string;
    domain?: string;
    score?: number;
    num_comments?: number;
    created_utc?: number;
    thumbnail?: string;
    stickied?: boolean;
    over_18?: boolean;
  };
}

/** Maps a raw Reddit listing to clean feed items (exported for unit tests). */
export function mapRedditListing(json: unknown): FeedItem[] {
  const children = (json as { data?: { children?: RedditChild[] } })?.data?.children;
  if (!Array.isArray(children)) return [];
  const items: FeedItem[] = [];
  for (const child of children) {
    const d = child?.data;
    if (!d?.id || !d.title || d.stickied || d.over_18) continue;
    const url = d.url_overridden_by_dest || d.url || `https://www.reddit.com${d.permalink}`;
    if (!/^https?:\/\//.test(url)) continue;
    const thumbnail =
      d.thumbnail && /^https?:\/\//.test(d.thumbnail) ? d.thumbnail : null;
    let domain = d.domain ?? "";
    if (!domain) {
      try {
        domain = new URL(url).hostname;
      } catch {
        continue;
      }
    }
    items.push({
      id: d.id,
      title: d.title,
      url,
      permalink: `https://www.reddit.com${d.permalink}`,
      subreddit: d.subreddit_name_prefixed,
      domain,
      score: d.score ?? 0,
      num_comments: d.num_comments ?? 0,
      created_utc: d.created_utc ?? 0,
      thumbnail,
    });
  }
  return items;
}

export type FeedSource = "reddit" | "hackernews";

export interface FeedResult {
  items: FeedItem[];
  source: FeedSource;
}

interface HnHit {
  objectID: string;
  title?: string;
  url?: string | null;
  points?: number;
  num_comments?: number;
  created_at_i?: number;
  author?: string;
}

/** Maps a Hacker News (Algolia) search result to feed items. */
export function mapHnHits(json: unknown): FeedItem[] {
  const hits = (json as { hits?: HnHit[] })?.hits;
  if (!Array.isArray(hits)) return [];
  const items: FeedItem[] = [];
  for (const hit of hits) {
    if (!hit?.objectID || !hit.title) continue;
    const permalink = `https://news.ycombinator.com/item?id=${hit.objectID}`;
    const url = hit.url && /^https?:\/\//.test(hit.url) ? hit.url : permalink;
    let domain: string;
    try {
      domain = new URL(url).hostname;
    } catch {
      continue;
    }
    items.push({
      id: hit.objectID,
      title: hit.title,
      url,
      permalink,
      subreddit: "Hacker News",
      domain,
      score: hit.points ?? 0,
      num_comments: hit.num_comments ?? 0,
      created_utc: hit.created_at_i ?? 0,
      thumbnail: null,
    });
  }
  return items;
}

const HN_SOURCES: Record<FeedId, string> = {
  news: "https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=25",
  popular: "https://hn.algolia.com/api/v1/search_by_date?tags=story&numericFilters=points>100&hitsPerPage=25",
  explore: "https://hn.algolia.com/api/v1/search?tags=story&query=science&hitsPerPage=25",
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<FeedId, { result: FeedResult; fetchedAt: number }>();

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { "user-agent": USER_AGENT, accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Feed responded with HTTP ${res.status}`);
  return res.json();
}

/**
 * Fetches a feed, preferring Reddit and falling back to the Hacker News API
 * (Reddit rejects many datacenter IPs). Results are cached; stale results
 * are served if both sources go down mid-session.
 */
export async function fetchFeed(feed: FeedId): Promise<FeedResult> {
  const cached = cache.get(feed);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.result;

  let result: FeedResult | null = null;
  try {
    const items = mapRedditListing(await getJson(`https://www.reddit.com${FEED_SOURCES[feed].path}`));
    if (items.length) result = { items, source: "reddit" };
  } catch {
    /* fall through to Hacker News */
  }
  if (!result) {
    try {
      const items = mapHnHits(await getJson(HN_SOURCES[feed]));
      if (items.length) result = { items, source: "hackernews" };
    } catch {
      /* both sources failed */
    }
  }
  if (!result) {
    if (cached) return cached.result; // stale beats nothing
    throw new Error("All feed sources are unreachable.");
  }
  cache.set(feed, { result, fetchedAt: Date.now() });
  return result;
}
