import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * SSRF protection for the extraction pipeline. Every URL — including every
 * redirect hop — must pass these checks before we connect to it.
 *
 * Known limitation (documented in ARCHITECTURE.md): we resolve DNS and then
 * fetch, so a hostile DNS server could in theory rebind between the check and
 * the request. Production hardening would pin the resolved IP at the socket
 * layer or route through an egress proxy.
 */

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

/** Parses and normalizes a user-supplied URL. Throws UnsafeUrlError. */
export function normalizeUrl(input: string): URL {
  const trimmed = input.trim();
  if (!trimmed) throw new UnsafeUrlError("URL is empty.");
  let candidate = trimmed;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(candidate)) {
    candidate = `https://${candidate}`; // convenience: allow bare domains
  }
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new UnsafeUrlError(`"${input.trim()}" is not a valid URL.`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError(`Only HTTP and HTTPS URLs are allowed (got ${url.protocol}//).`);
  }
  if (!url.hostname) throw new UnsafeUrlError("URL has no host.");
  if (url.username || url.password) {
    throw new UnsafeUrlError("URLs with embedded credentials are not allowed.");
  }
  url.hash = "";
  return url;
}

const FORBIDDEN_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.goog",
  "instance-data",
]);

const FORBIDDEN_HOST_SUFFIXES = [".localhost", ".local", ".internal", ".home.arpa"];

export function isForbiddenHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, "");
  if (FORBIDDEN_HOSTNAMES.has(h)) return true;
  return FORBIDDEN_HOST_SUFFIXES.some((suffix) => h.endsWith(suffix));
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    value = value * 256 + n;
  }
  return value;
}

function inCidr4(ipInt: number, cidr: string): boolean {
  const [base, bitsStr] = cidr.split("/");
  const baseInt = ipv4ToInt(base);
  const bits = Number(bitsStr);
  if (baseInt === null) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return ((ipInt & mask) >>> 0) === ((baseInt & mask) >>> 0);
}

/** Blocked IPv4 ranges: loopback, private, link-local, metadata, reserved. */
const BLOCKED_V4 = [
  "0.0.0.0/8", // "this network"
  "10.0.0.0/8", // private
  "100.64.0.0/10", // carrier-grade NAT
  "127.0.0.0/8", // loopback
  "169.254.0.0/16", // link-local incl. cloud metadata 169.254.169.254
  "172.16.0.0/12", // private
  "192.0.0.0/24", // IETF protocol assignments
  "192.0.2.0/24", // TEST-NET-1
  "192.168.0.0/16", // private
  "198.18.0.0/15", // benchmarking
  "198.51.100.0/24", // TEST-NET-2
  "203.0.113.0/24", // TEST-NET-3
  "224.0.0.0/4", // multicast
  "240.0.0.0/4", // reserved
  "255.255.255.255/32", // broadcast
];

export function isBlockedIp(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) {
    const ipInt = ipv4ToInt(ip);
    if (ipInt === null) return true;
    return BLOCKED_V4.some((cidr) => inCidr4(ipInt, cidr));
  }
  if (family === 6) {
    const lower = ip.toLowerCase();
    // IPv4-mapped IPv6 (::ffff:a.b.c.d) — check the embedded IPv4.
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isBlockedIp(mapped[1]);
    if (lower === "::" || lower === "::1") return true; // unspecified / loopback
    if (/^f[cd]/.test(lower)) return true; // fc00::/7 unique local
    if (/^fe[89ab]/.test(lower)) return true; // fe80::/10 link-local
    if (lower.startsWith("2001:db8")) return true; // documentation
    if (lower.startsWith("ff")) return true; // multicast
    if (lower.startsWith("64:ff9b")) return true; // NAT64 — may hide v4
    return false;
  }
  return true; // not a valid IP at all
}

/**
 * Full safety gate: normalize, check the hostname, resolve DNS and verify
 * every resolved address is public. Returns the normalized URL.
 */
export async function assertSafeUrl(input: string | URL): Promise<URL> {
  const url = typeof input === "string" ? normalizeUrl(input) : input;
  const hostname = url.hostname.replace(/^\[|\]$/g, ""); // strip IPv6 brackets

  if (isForbiddenHostname(hostname)) {
    throw new UnsafeUrlError(`Requests to "${hostname}" are not allowed.`);
  }

  if (isIP(hostname)) {
    if (isBlockedIp(hostname)) {
      throw new UnsafeUrlError(`The address ${hostname} is in a blocked range.`);
    }
    return url;
  }

  let addresses: { address: string }[];
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new UnsafeUrlError(`Could not resolve "${hostname}".`);
  }
  if (!addresses.length) {
    throw new UnsafeUrlError(`Could not resolve "${hostname}".`);
  }
  for (const { address } of addresses) {
    if (isBlockedIp(address)) {
      throw new UnsafeUrlError(
        `"${hostname}" resolves to a private or reserved address and was blocked.`,
      );
    }
  }
  return url;
}
