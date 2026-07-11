import { errors, fail, handle, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { fetchFeed, feedLabel, isFeedId } from "@/lib/explore/feeds";
import { rateLimit } from "@/lib/rate-limit";

/** GET /api/explore?feed=news|popular|explore — cached discovery feeds. */
export async function GET(req: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw errors.unauthorized();
    if (!rateLimit(`explore:${user.id}`, 30, 60_000)) {
      return fail("rate_limited", "Too many feed refreshes — give it a few seconds.", 429);
    }
    const feed = new URL(req.url).searchParams.get("feed") ?? "news";
    if (!isFeedId(feed)) {
      return fail("invalid_feed", "feed must be news, popular or explore.", 400);
    }
    try {
      const { items, source } = await fetchFeed(feed);
      return ok({ feed, label: feedLabel(feed), items, source });
    } catch {
      return fail(
        "feed_unavailable",
        "The live feeds are unreachable from this network right now. The rest of Joink keeps working — try again in a minute.",
        503,
      );
    }
  });
}
