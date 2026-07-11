import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env, supabaseConfigured } from "@/lib/env";
import { setDemoSession } from "@/lib/auth";
import { createServiceClient, createUserClient } from "@/lib/supabase/server";

/**
 * Relying-Party config for WebAuthn, derived from the request host so passkeys
 * bind to whatever domain the user is actually on (e.g. jkarsu.com in prod,
 * localhost in dev). Passkeys registered on one domain only work on that domain.
 */
export function rpFromRequest(req: Request): { rpID: string; origin: string; rpName: string } {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  const proto =
    req.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return { rpID: host.split(":")[0], origin: `${proto}://${host}`, rpName: "Joink" };
}

// ── short-lived, HMAC-signed challenge cookie (no DB round-trip) ──────

const REG_COOKIE = "joink_wa_reg";
const AUTH_COOKIE = "joink_wa_auth";

function sign(value: string): string {
  const mac = createHmac("sha256", env.demoSessionSecret).update(value).digest("hex");
  return `${value}.${mac}`;
}

function unsign(token: string | undefined): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const value = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const expected = createHmac("sha256", env.demoSessionSecret).update(value).digest("hex");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return value;
}

export async function storeChallenge(kind: "reg" | "auth", challenge: string): Promise<void> {
  const store = await cookies();
  store.set(kind === "reg" ? REG_COOKIE : AUTH_COOKIE, sign(challenge), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 300, // 5 minutes to complete the ceremony
  });
}

export async function takeChallenge(kind: "reg" | "auth"): Promise<string | null> {
  const name = kind === "reg" ? REG_COOKIE : AUTH_COOKIE;
  const store = await cookies();
  const value = unsign(store.get(name)?.value);
  store.delete(name); // single-use
  return value;
}

/**
 * Establishes a signed-in session for a verified user after a passkey login.
 * In Supabase mode we mint a real session via an admin magic-link token (no
 * email is sent); in demo mode we set the demo cookie.
 */
export async function establishSession(userId: string): Promise<boolean> {
  if (!supabaseConfigured()) {
    await setDemoSession(userId);
    return true;
  }
  const admin = createServiceClient();
  const { data: userRes, error: userErr } = await admin.auth.admin.getUserById(userId);
  const email = userRes?.user?.email;
  if (userErr || !email) return false;

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const tokenHash = linkData?.properties?.hashed_token;
  if (linkErr || !tokenHash) return false;

  const supabase = await createUserClient();
  const { error: otpErr } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });
  return !otpErr;
}
