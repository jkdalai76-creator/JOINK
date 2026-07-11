import { describe, expect, it } from "vitest";
import { answerSupport, PRODUCT_FACTS, SUPPORT_SYSTEM_RULE } from "@/lib/support/agent";

// With no AI key configured (the test env), answerSupport uses the keyword
// fallback — deterministic and offline.

describe("support agent fallback", () => {
  it("routes getting-started questions to the extraction how-to", async () => {
    const { answer, usedAi } = await answerSupport("How do I get started?");
    expect(usedAi).toBe(false);
    expect(answer.toLowerCase()).toContain("new project");
  });

  it("answers pricing questions with plan facts", async () => {
    const { answer } = await answerSupport("What does Pro cost?");
    expect(answer).toContain("₹499");
  });

  it("explains voice", async () => {
    const { answer } = await answerSupport("how does the microphone work");
    expect(answer.toLowerCase()).toContain("transcript");
  });

  it("explains why a URL failed", async () => {
    const { answer } = await answerSupport("why did my url fail and show blocked");
    expect(answer.toLowerCase()).toMatch(/robots|login|private|mistyped/);
  });

  it("gives a helpful default for unrelated questions", async () => {
    const { answer } = await answerSupport("qwerty zxcv?");
    expect(answer.length).toBeGreaterThan(0);
    expect(answer.toLowerCase()).toContain("joink");
  });

  it("exposes a system rule and product facts for the AI path", () => {
    expect(SUPPORT_SYSTEM_RULE).toMatch(/support/i);
    expect(PRODUCT_FACTS).toMatch(/Free|Pro/);
  });
});
