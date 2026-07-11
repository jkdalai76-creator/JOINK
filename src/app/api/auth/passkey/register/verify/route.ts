import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { errors, fail, handle, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { rpFromRequest, takeChallenge } from "@/lib/webauthn";

/** Verifies the attestation and stores the new passkey for the signed-in user. */
export async function POST(req: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw errors.unauthorized();

    const expectedChallenge = await takeChallenge("reg");
    if (!expectedChallenge) {
      return fail("challenge_expired", "That took too long — please try again.", 400);
    }
    const body = await req.json().catch(() => null);
    if (!body) return fail("invalid_request", "Malformed passkey response.", 400);

    const { rpID, origin } = rpFromRequest(req);
    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });
    if (!verification.verified || !verification.registrationInfo) {
      return fail("verification_failed", "Could not verify that passkey.", 400);
    }

    const { credential } = verification.registrationInfo;
    const store = await getStore();
    await store.createCredential({
      user_id: user.id,
      credential_id: credential.id,
      public_key: isoBase64URL.fromBuffer(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports ?? null,
      device_label: body.deviceLabel ?? null,
    });
    return ok({ registered: true });
  });
}
