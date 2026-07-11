import { errors, handle, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";

export async function GET() {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw errors.unauthorized();
    const store = await getStore();
    const payments = await store.listPayments(user.id);
    return ok({ payments });
  });
}
