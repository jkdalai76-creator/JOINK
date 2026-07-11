import { describe, expect, it } from "vitest";
import {
  isBlockedIp,
  isForbiddenHostname,
  normalizeUrl,
  UnsafeUrlError,
} from "@/lib/scraper/url-safety";

describe("normalizeUrl", () => {
  it("normalizes bare domains to https", () => {
    expect(normalizeUrl("example.com/page").toString()).toBe("https://example.com/page");
  });

  it("keeps http and https", () => {
    expect(normalizeUrl("http://example.com").protocol).toBe("http:");
    expect(normalizeUrl("https://example.com").protocol).toBe("https:");
  });

  it("strips fragments", () => {
    expect(normalizeUrl("https://example.com/a#section").hash).toBe("");
  });

  it("rejects non-http(s) schemes", () => {
    expect(() => normalizeUrl("file:///etc/passwd")).toThrow(UnsafeUrlError);
    expect(() => normalizeUrl("ftp://example.com")).toThrow(UnsafeUrlError);
    expect(() => normalizeUrl("javascript:alert(1)")).toThrow(UnsafeUrlError);
  });

  it("rejects malformed URLs and empty input", () => {
    expect(() => normalizeUrl("")).toThrow(UnsafeUrlError);
    expect(() => normalizeUrl("http://")).toThrow(UnsafeUrlError);
    expect(() => normalizeUrl("not a url at all :: %%")).toThrow(UnsafeUrlError);
  });

  it("rejects embedded credentials", () => {
    expect(() => normalizeUrl("https://user:pass@example.com")).toThrow(UnsafeUrlError);
  });
});

describe("isForbiddenHostname", () => {
  it("blocks localhost and internal suffixes", () => {
    expect(isForbiddenHostname("localhost")).toBe(true);
    expect(isForbiddenHostname("LOCALHOST")).toBe(true);
    expect(isForbiddenHostname("foo.localhost")).toBe(true);
    expect(isForbiddenHostname("db.internal")).toBe(true);
    expect(isForbiddenHostname("printer.local")).toBe(true);
    expect(isForbiddenHostname("metadata.google.internal")).toBe(true);
  });

  it("allows normal public hostnames", () => {
    expect(isForbiddenHostname("example.com")).toBe(false);
    expect(isForbiddenHostname("sub.example.co.in")).toBe(false);
  });
});

describe("isBlockedIp", () => {
  it("blocks loopback, private, link-local and metadata ranges", () => {
    for (const ip of [
      "127.0.0.1", "127.255.255.254", "10.0.0.5", "172.16.0.1", "172.31.255.255",
      "192.168.1.1", "169.254.169.254", "0.0.0.0", "100.64.1.1", "198.18.0.1",
      "224.0.0.1", "240.0.0.1", "255.255.255.255",
    ]) {
      expect(isBlockedIp(ip), ip).toBe(true);
    }
  });

  it("blocks IPv6 loopback, unique-local, link-local and mapped IPv4", () => {
    for (const ip of ["::1", "::", "fc00::1", "fd12:3456::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1"]) {
      expect(isBlockedIp(ip), ip).toBe(true);
    }
  });

  it("allows public addresses", () => {
    for (const ip of ["93.184.216.34", "8.8.8.8", "2606:2800:220:1:248:1893:25c8:1946"]) {
      expect(isBlockedIp(ip), ip).toBe(false);
    }
  });

  it("treats garbage as blocked", () => {
    expect(isBlockedIp("not-an-ip")).toBe(true);
  });
});
