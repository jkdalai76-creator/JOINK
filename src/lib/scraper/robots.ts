import { USER_AGENT } from "./fetcher";

/**
 * Best-effort robots.txt support ("respect robots.txt where practical").
 * We honour `User-agent: *` and `User-agent: joinkbot` groups. If robots.txt
 * cannot be fetched or parsed, extraction proceeds (fail-open) — but an
 * explicit Disallow match blocks the URL.
 */

interface RobotsRules {
  disallow: string[];
  allow: string[];
}

const cache = new Map<string, { rules: RobotsRules | null; fetchedAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

export function parseRobots(body: string, agent = "joinkbot"): RobotsRules {
  const rules: RobotsRules = { disallow: [], allow: [] };
  let applies = false;
  let sawAnyAgent = false;
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (field === "user-agent") {
      const ua = value.toLowerCase();
      // A new user-agent line after rules starts a new group.
      if (sawAnyAgent && (rules.disallow.length || rules.allow.length) && applies) {
        // keep already-collected applicable rules; further groups may also apply
      }
      applies = ua === "*" || agent.toLowerCase().includes(ua) || ua.includes(agent.toLowerCase());
      sawAnyAgent = true;
    } else if (applies && field === "disallow" && value) {
      rules.disallow.push(value);
    } else if (applies && field === "allow" && value) {
      rules.allow.push(value);
    }
  }
  return rules;
}

export function isPathAllowed(rules: RobotsRules, path: string): boolean {
  const matches = (patterns: string[]) =>
    patterns
      .filter((p) => path.startsWith(p.replace(/\*.*$/, "")))
      .reduce((longest, p) => (p.length > longest.length ? p : longest), "");
  const allowMatch = matches(rules.allow);
  const disallowMatch = matches(rules.disallow);
  if (!disallowMatch) return true;
  return allowMatch.length >= disallowMatch.length;
}

export async function robotsAllows(url: URL): Promise<boolean> {
  const origin = url.origin;
  const cached = cache.get(origin);
  let rules: RobotsRules | null;
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    rules = cached.rules;
  } else {
    rules = await fetchRobots(origin);
    cache.set(origin, { rules, fetchedAt: Date.now() });
  }
  if (!rules) return true; // could not fetch → proceed politely
  return isPathAllowed(rules, url.pathname || "/");
}

async function fetchRobots(origin: string): Promise<RobotsRules | null> {
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      signal: AbortSignal.timeout(4000),
      headers: { "user-agent": USER_AGENT },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (text.length > 512 * 1024) return null;
    return parseRobots(text);
  } catch {
    return null;
  }
}
