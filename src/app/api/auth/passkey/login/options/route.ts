import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { handle, ok } from "@/lib/api";
import { rpFromRequest, storeChallenge } from "@/lib/webauthn";

/**
 * Login options. We use discoverable credentials (no allowCredentials), so the
 * browser offers the user's saved passkeys for this site without an email.
 */
export async function POST(req: Request) {
  return handle(async () => {
    const { rpID } = rpFromRequest(req);
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "preferred",
    });
    await storeChallenge("auth", options.challenge);
    return ok(options);
  });
}
