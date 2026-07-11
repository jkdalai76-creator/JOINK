import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";
import { fail, handle, ok } from "@/lib/api";
import { getStore } from "@/lib/store";
import { establishSession, rpFromRequest, takeChallenge } from "@/lib/webauthn";

/** Verifies a passkey assertion and, on success, signs the user in. */
export async function POST(req: Request) {
  return handle(async () => {
    const expectedChallenge = await takeChallenge("auth");
    if (!expectedChallenge) {
      return fail("challenge_expired", "That took too long — please try again.", 400);
    }
    const body = await req.json().catch(() => null);
    if (!body?.id) return fail("invalid_request", "Malformed passkey response.", 400);

    const store = await getStore();
    const cred = await store.getCredentialByCredentialId(body.id);
    if (!cred) return fail("unknown_passkey", "This passkey isn't registered here.", 401);

    const { rpID, origin } = rpFromRequest(req);
    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
      credential: {
        id: cred.credential_id,
        publicKey: isoBase64URL.toBuffer(cred.public_key),
        counter: cred.counter,
        transports: (cred.transports ?? undefined) as AuthenticatorTransportFuture[] | undefined,
      },
    });
    if (!verification.verified) {
      return fail("verification_failed", "Could not verify that passkey.", 401);
    }

    await store.updateCredentialCounter(cred.id, verification.authenticationInfo.newCounter);

    const started = await establishSession(cred.user_id);
    if (!started) {
      return fail("session_failed", "Verified, but could not start a session. Try again.", 500);
    }
    return ok({ signedIn: true });
  });
}
