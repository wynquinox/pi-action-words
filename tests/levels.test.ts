import { describe, expect, it } from "vitest";

import { DEFAULT_THINKING_LEVEL, normalizeThinkingLevel, THINKING_LEVELS } from "../src/levels.js";

describe("THINKING_LEVELS", () => {
  it("contains exactly the seven pi thinking levels", () => {
    expect([...THINKING_LEVELS]).toEqual([
      "off",
      "minimal",
      "low",
      "medium",
      "high",
      "xhigh",
      "max",
    ]);
  });
});

describe("normalizeThinkingLevel", () => {
  it("passes every known level through unchanged", () => {
    for (const level of THINKING_LEVELS) {
      expect(normalizeThinkingLevel(level)).toBe(level);
    }
  });

  it("falls back to the default level for unknown strings", () => {
    expect(normalizeThinkingLevel("ultra")).toBe(DEFAULT_THINKING_LEVEL);
    expect(normalizeThinkingLevel("OFF")).toBe(DEFAULT_THINKING_LEVEL);
    expect(normalizeThinkingLevel("")).toBe(DEFAULT_THINKING_LEVEL);
  });

  it("falls back to the default level for non-string values", () => {
    expect(normalizeThinkingLevel(undefined)).toBe(DEFAULT_THINKING_LEVEL);
    expect(normalizeThinkingLevel(null)).toBe(DEFAULT_THINKING_LEVEL);
    expect(normalizeThinkingLevel(42)).toBe(DEFAULT_THINKING_LEVEL);
    expect(normalizeThinkingLevel({ level: "high" })).toBe(DEFAULT_THINKING_LEVEL);
  });
});
