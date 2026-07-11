import { describe, expect, it } from "vitest";
import { isFeedId, mapHnHits, mapRedditListing } from "@/lib/explore/feeds";

function listing(children: unknown[]) {
  return { data: { children } };
}

const post = (over: Record<string, unknown> = {}) => ({
  data: {
    id: "abc",
    title: "A headline",
    url: "https://news.example.com/story",
    permalink: "/r/news/comments/abc/a_headline/",
    subreddit_name_prefixed: "r/news",
    domain: "news.example.com",
    score: 1234,
    num_comments: 56,
    created_utc: 1_700_000_000,
    thumbnail: "https://b.thumbs.example/x.jpg",
    stickied: false,
    over_18: false,
    ...over,
  },
});

describe("mapRedditListing", () => {
  it("maps posts to clean feed items", () => {
    const items = mapRedditListing(listing([post()]));
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "abc",
      title: "A headline",
      url: "https://news.example.com/story",
      permalink: "https://www.reddit.com/r/news/comments/abc/a_headline/",
      subreddit: "r/news",
      score: 1234,
      num_comments: 56,
      thumbnail: "https://b.thumbs.example/x.jpg",
    });
  });

  it("skips stickied and adult posts", () => {
    const items = mapRedditListing(
      listing([post({ stickied: true }), post({ id: "x", over_18: true })]),
    );
    expect(items).toHaveLength(0);
  });

  it("drops non-http urls and placeholder thumbnails", () => {
    const items = mapRedditListing(
      listing([post({ url: "javascript:alert(1)", url_overridden_by_dest: undefined, permalink: undefined })]),
    );
    expect(items).toHaveLength(0);
    const ok = mapRedditListing(listing([post({ thumbnail: "self" })]));
    expect(ok[0].thumbnail).toBeNull();
  });

  it("tolerates malformed payloads", () => {
    expect(mapRedditListing(null)).toEqual([]);
    expect(mapRedditListing({})).toEqual([]);
    expect(mapRedditListing({ data: { children: [{}] } })).toEqual([]);
  });
});

describe("mapHnHits", () => {
  it("maps Hacker News hits, falling back to the discussion link", () => {
    const items = mapHnHits({
      hits: [
        { objectID: "1", title: "Show HN: Thing", url: "https://thing.example", points: 321, num_comments: 45 },
        { objectID: "2", title: "Ask HN: Question", url: null },
        { objectID: "3", title: undefined },
      ],
    });
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ url: "https://thing.example", score: 321, subreddit: "Hacker News" });
    expect(items[1].url).toBe("https://news.ycombinator.com/item?id=2");
  });

  it("tolerates malformed payloads", () => {
    expect(mapHnHits(null)).toEqual([]);
    expect(mapHnHits({})).toEqual([]);
  });
});

describe("isFeedId", () => {
  it("accepts only known feeds", () => {
    expect(isFeedId("news")).toBe(true);
    expect(isFeedId("popular")).toBe(true);
    expect(isFeedId("explore")).toBe(true);
    expect(isFeedId("all")).toBe(false);
    expect(isFeedId("")).toBe(false);
  });
});
