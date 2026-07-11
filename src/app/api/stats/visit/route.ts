import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { handle, ok } from "@/lib/api";
import { getBackgroundStore } from "@/lib/store";

const VISITOR_COOKIE = "joink_visitor";

/**
 * Visit tracking. POST registers the visitor (an anonymous random id in an
 * httpOnly cookie — no personal data) exactly once and returns the cumulative
 * unique-visitor count; GET just reads the count.
 */
export async function POST() {
  return handle(async () => {
    const cookieStore = await cookies();
    let key = cookieStore.get(VISITOR_COOKIE)?.value;
    const isNew = !key;
    if (!key) {
      key = randomUUID();
      cookieStore.set(VISITOR_COOKIE, key, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    void isNew; // recordVisitor is idempotent per key either way
    const store = getBackgroundStore();
    const total = await store.recordVisitor(key);
    return ok({ total });
  });
}

export async function GET() {
  return handle(async () => {
    const store = getBackgroundStore();
    return ok({ total: await store.countVisitors() });
  });
}
