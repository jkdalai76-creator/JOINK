import { z } from "zod";
import { errors, handle, ok, parseBody } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";

/** Lists the signed-in user's passkeys (safe fields only). */
export async function GET() {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw errors.unauthorized();
    const store = await getStore();
    const creds = await store.listCredentialsByUser(user.id);
    return ok({
      passkeys: creds.map((c) => ({
        id: c.id,
        device_label: c.device_label,
        created_at: c.created_at,
        last_used_at: c.last_used_at,
      })),
    });
  });
}

const delSchema = z.object({ id: z.string().min(1) });

/** Removes one of the signed-in user's passkeys. */
export async function DELETE(req: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw errors.unauthorized();
    const { id } = await parseBody(req, delSchema);
    const store = await getStore();
    await store.deleteCredential(user.id, id);
    return ok({ deleted: true });
  });
}
