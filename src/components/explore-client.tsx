"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import {
  ArrowUpRight, Compass, Flame, MessageCircle, Newspaper, RefreshCw, TrendingUp,
} from "lucide-react";
import { api } from "@/lib/client";
import type { FeedId, FeedItem } from "@/lib/explore/feeds";
import { Alert, Badge, Button, Card, EmptyState, Skeleton } from "@/components/ui";

const FEEDS: { id: FeedId; label: string; icon: React.ReactNode; blurb: string }[] = [
  { id: "news", label: "News", icon: <Newspaper className="h-4 w-4" />, blurb: "Top world & national news today" },
  { id: "popular", label: "Popular", icon: <Flame className="h-4 w-4" />, blurb: "What the internet is reading right now" },
  { id: "explore", label: "Explore", icon: <Compass className="h-4 w-4" />, blurb: "Tech, science and data discoveries" },
];

export function ExploreClient({ initialFeed }: { initialFeed: FeedId }) {
  const router = useRouter();
  const [feed, setFeed] = React.useState<FeedId>(initialFeed);
  const [items, setItems] = React.useState<FeedItem[] | null>(null);
  const [source, setSource] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  const load = React.useCallback(async (which: FeedId) => {
    setError(null);
    const res = await api<{ items: FeedItem[]; source: string }>(`/api/explore?feed=${which}`);
    if (!res.success) {
      setItems([]);
      setError(res.error.message);
      return;
    }
    setItems(res.data.items);
    setSource(res.data.source);
  }, []);

  React.useEffect(() => {
    setItems(null);
    void load(feed);
    // Keep the URL shareable and the header nav highlight in sync.
    router.replace(`/explore?feed=${feed}`, { scroll: false });
  }, [feed, load, router]);

  const active = FEEDS.find((f) => f.id === feed)!;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Explore the web</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {active.blurb} — spot something interesting, then extract it with Joink.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          loading={refreshing}
          onClick={async () => {
            setRefreshing(true);
            await load(feed);
            setRefreshing(false);
          }}
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Refresh
        </Button>
      </div>

      {/* Feed buttons */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Feeds">
        {FEEDS.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={feed === f.id}
            onClick={() => setFeed(f.id)}
            className={
              feed === f.id
                ? "inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
                : "inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            }
          >
            {f.icon}
            {f.label}
          </button>
        ))}
      </div>

      {error && <Alert tone="warn">{error}</Alert>}

      {items === null ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : items.length === 0 && !error ? (
        <EmptyState
          title="Nothing to show"
          description="The feed came back empty — try refreshing in a minute."
        />
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <Card key={item.id} className="flex gap-4 p-4 sm:p-5">
              <div className="hidden w-10 shrink-0 pt-1 text-center sm:block">
                <span className="text-sm font-bold text-slate-400">{index + 1}</span>
                <div className="mt-1 flex flex-col items-center text-xs text-slate-500">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
                  {formatCount(item.score)}
                </div>
              </div>
              {item.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.thumbnail}
                  alt=""
                  className="hidden h-16 w-24 shrink-0 rounded-lg object-cover sm:block"
                  loading="lazy"
                />
              )}
              <div className="min-w-0 flex-1">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="line-clamp-2 font-medium text-slate-900 hover:text-indigo-600"
                >
                  {item.title}
                </a>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <Badge tone="indigo">{item.subreddit}</Badge>
                  <span className="truncate">{item.domain}</span>
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" aria-hidden />
                    {formatCount(item.num_comments)} comments
                  </span>
                  <a
                    href={item.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline"
                  >
                    discussion
                  </a>
                </div>
              </div>
              <div className="flex shrink-0 flex-col justify-center gap-2">
                <Link href={`/projects/new?url=${encodeURIComponent(item.url)}`}>
                  <Button size="sm" variant="outline">
                    Extract
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
          <p className="pt-2 text-center text-xs text-slate-400">
            Feed via {source === "hackernews" ? "the Hacker News API" : "Reddit's public API"} ·
            refreshed every few minutes · every story links to its source
          </p>
        </div>
      )}
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(n);
}
