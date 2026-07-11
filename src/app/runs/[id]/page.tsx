import { RequireAuth } from "@/components/require-auth";
import { RunWorkspace } from "@/components/run-workspace";

export const metadata = { title: "Extraction results" };

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RequireAuth>
      <RunWorkspace runId={id} />
    </RequireAuth>
  );
}
