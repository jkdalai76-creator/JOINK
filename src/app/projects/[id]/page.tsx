import { RequireAuth } from "@/components/require-auth";
import { ProjectClient } from "@/components/project-client";

export const metadata = { title: "Project" };

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RequireAuth>
      <ProjectClient projectId={id} />
    </RequireAuth>
  );
}
