import { RequireAuth } from "@/components/require-auth";
import { DashboardClient } from "@/components/dashboard-client";

export const metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardClient />
    </RequireAuth>
  );
}
