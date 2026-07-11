import { cookies } from "next/headers";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { env, supabaseConfigured } from "@/lib/env";
import { MemoryStore } from "@/lib/store/memory";
import { createUserClient } from "@/lib/supabase/server";

export interface SessionUser {
  id: string;
  email: string;
  display_name: string;
}

const DEMO_COOKIE = "joink_session";
export const DEMO_USER_EMAIL = "demo@joink.app";

// ── demo-mode session cookie helpers (HMAC-signed user id) ──────────

function sign(userId: string): string {
  const mac = createHmac("sha256", env.demoSessionSecret).update(userId).digest("hex");
  return `${userId}.${mac}`;
}

function verify(token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const userId = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const expected = createHmac("sha256", env.demoSessionSecret).update(userId).digest("hex");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return userId;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

// ── current user ────────────────────────────────────────────────────

export async function getCurrentUser(): Promise<SessionUser | null> {
  if (supabaseConfigured()) {
    const supabase = await createUserClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    const meta = (data.user.user_metadata ?? {}) as { display_name?: string };
    return {
      id: data.user.id,
      email: data.user.email ?? "",
      display_name: meta.display_name || (data.user.email ?? "").split("@")[0] || "User",
    };
  }
  const cookieStore = await cookies();
  const token = cookieStore.get(DEMO_COOKIE)?.value;
  if (!token) return null;
  const userId = verify(token);
  if (!userId) return null;
  const user = await new MemoryStore().getUserById(userId);
  if (!user) return null;
  return { id: user.id, email: user.email, display_name: user.display_name };
}

// ── demo-mode auth operations (called from route handlers only) ─────

export async function demoSignUp(
  email: string,
  password: string,
  displayName: string,
): Promise<{ user: SessionUser | null; error?: string }> {
  const store = new MemoryStore();
  const created = await store.createUser({
    email,
    display_name: displayName,
    password_hash: hashPassword(password),
  });
  if (!created) return { user: null, error: "An account with this email already exists." };
  await setDemoSession(created.id);
  return { user: { id: created.id, email: created.email, display_name: created.display_name } };
}

export async function demoSignIn(
  email: string,
  password: string,
): Promise<{ user: SessionUser | null; error?: string }> {
  const store = new MemoryStore();
  const user = await store.getUserByEmail(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return { user: null, error: "Incorrect email or password." };
  }
  await setDemoSession(user.id);
  return { user: { id: user.id, email: user.email, display_name: user.display_name } };
}

/** Signs in as the shared demo user, creating it on first use. */
export async function demoUserSignIn(): Promise<SessionUser> {
  const store = new MemoryStore();
  let user = await store.getUserByEmail(DEMO_USER_EMAIL);
  if (!user) {
    user = await store.createUser({
      email: DEMO_USER_EMAIL,
      display_name: "Demo User",
      password_hash: hashPassword(randomBytes(16).toString("hex")),
    });
  }
  await setDemoSession(user!.id);
  return { id: user!.id, email: user!.email, display_name: user!.display_name };
}

async function setDemoSession(userId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(DEMO_COOKIE, sign(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearDemoSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(DEMO_COOKIE);
}
