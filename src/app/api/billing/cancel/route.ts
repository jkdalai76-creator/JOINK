import { errors, fail, handle, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { requestCancellation } from "@/lib/billing/service";
import { getStore } from "@/lib/store";

export async function POST() {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw errors.unauthorized();
    const store = await getStore();
    const subscription = await requestCancellation(store, user.id);
    if (!subscription) {
      return fail("no_subscription", "You do not have an active paid subscription.", 404);
    }
    return ok({ subscription });
  });
}
