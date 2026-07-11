import { RequireAuth } from "@/components/require-auth";
import { ExtractionForm } from "@/components/extraction-form";

export const metadata = { title: "New project" };

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;
  return (
    <RequireAuth>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-slate-900">New project</h1>
        <p className="mt-1 mb-6 text-sm text-slate-500">
          Name your project, paste the URLs you want to extract, and choose what to capture.
        </p>
        <ExtractionForm initialUrls={typeof url === "string" ? url : undefined} />
      </div>
    </RequireAuth>
  );
}
