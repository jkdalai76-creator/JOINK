import { handle, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { runtimeMode } from "@/lib/env";

export async function GET() {
  return handle(async () => {
    const user = await getCurrentUser();
    return ok({ user, mode: runtimeMode() });
  });
}
