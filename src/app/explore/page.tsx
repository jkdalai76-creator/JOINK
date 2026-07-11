import { RequireAuth } from "@/components/require-auth";
import { ExploreClient } from "@/components/explore-client";

export const metadata = { title: "Explore" };

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ feed?: string }>;
}) {
  const { feed } = await searchParams;
  const initialFeed = feed === "popular" || feed === "explore" ? feed : "news";
  return (
    <RequireAuth>
      <ExploreClient initialFeed={initialFeed} />
    </RequireAuth>
  );
}
