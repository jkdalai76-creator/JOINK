import { RequireAuth } from "@/components/require-auth";
import { BillingClient } from "@/components/billing-client";

export const metadata = { title: "Billing" };

export default function BillingPage() {
  return (
    <RequireAuth>
      <BillingClient />
    </RequireAuth>
  );
}
