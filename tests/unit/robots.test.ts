import { describe, expect, it } from "vitest";
import { isPathAllowed, parseRobots } from "@/lib/scraper/robots";

describe("robots.txt parsing", () => {
  it("collects rules from the wildcard group", () => {
    const rules = parseRobots(`
User-agent: *
Disallow: /private/
Allow: /private/public-page
`);
    expect(isPathAllowed(rules, "/private/secret")).toBe(false);
    expect(isPathAllowed(rules, "/private/public-page")).toBe(true);
    expect(isPathAllowed(rules, "/open")).toBe(true);
  });

  it("matches the joinkbot group", () => {
    const rules = parseRobots(`
User-agent: joinkbot
Disallow: /no-bots/
`);
    expect(isPathAllowed(rules, "/no-bots/here")).toBe(false);
  });

  it("ignores unrelated agent groups", () => {
    const rules = parseRobots(`
User-agent: othercrawler
Disallow: /
`);
    expect(isPathAllowed(rules, "/anything")).toBe(true);
  });

  it("treats empty robots as allow-all", () => {
    const rules = parseRobots("");
    expect(isPathAllowed(rules, "/")).toBe(true);
  });
});
