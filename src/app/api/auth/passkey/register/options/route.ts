import { generateRegistrationOptions } from "@simplewebauthn/server";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";
import { errors, handle, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { rpFromRequest, storeChallenge } from "@/lib/webauthn";

/** Registration options — the user must already be signed in to add a passkey. */
export async function POST(req: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw errors.unauthorized();

    const { rpID, rpName } = rpFromRequest(req);
    const store = await getStore();
    const existing = await store.listCredentialsByUser(user.id);

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: user.email,
      userDisplayName: user.display_name,
      userID: new TextEncoder().encode(user.id),
      attestationType: "none",
      excludeCredentials: existing.map((c) => ({
        id: c.credential_id,
        transports: (c.transports ?? undefined) as AuthenticatorTransportFuture[] | undefined,
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    });

    await storeChallenge("reg", options.challenge);
    return ok(options);
  });
}
