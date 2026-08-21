import { describe, expect, it } from "vitest";

import { THINKING_LEVELS, type ThinkingLevel } from "../src/levels.js";
import { PHASES } from "../src/phases.js";
import { buildWorkingPhrase, formatPhasePhrase, getPhrasePool } from "../src/phrases.js";

describe("phrase pools", () => {
  it("has a non-empty pool for every (phase, level) combination", () => {
    for (const phase of PHASES) {
      for (const level of THINKING_LEVELS) {
        const pool = getPhrasePool(phase, level);
        expect(pool.length, `phase=${phase} level=${level}`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("only contains non-empty, trimmed, unique phrases per pool", () => {
    for (const phase of PHASES) {
      for (const level of THINKING_LEVELS) {
        const pool = getPhrasePool(phase, level);
        for (const phrase of pool) {
          expect(typeof phrase, `${phase}/${level}`).toBe("string");
          expect(phrase.length).toBeGreaterThan(0);
          expect(phrase).toBe(phrase.trim());
        }
        expect(new Set(pool).size, `phase=${phase} level=${level}`).toBe(pool.length);
      }
    }
  });

  it("keeps every 'other' template parameterized with {tool}", () => {
    for (const level of THINKING_LEVELS) {
      for (const template of getPhrasePool("other", level)) {
        expect(template, `${level}`).toContain("{tool}");
      }
    }
  });
});

describe("formatPhasePhrase", () => {
  it("substitutes {tool} for the 'other' phase", () => {
    expect(formatPhasePhrase("consulting {tool}", "other", "my_tool")).toBe("consulting my_tool");
  });

  it("falls back to 'the tool' when the tool name is missing or empty", () => {
    expect(formatPhasePhrase("consulting {tool}", "other", undefined)).toBe("consulting the tool");
    expect(formatPhasePhrase("consulting {tool}", "other", "")).toBe("consulting the tool");
  });

  it("substitutes every occurrence of {tool}", () => {
    expect(formatPhasePhrase("{tool} and {tool}", "other", "x")).toBe("x and x");
  });

  it("leaves non-'other' phrases untouched even when they contain {tool}", () => {
    expect(formatPhasePhrase("consulting {tool}", "bash", "my_tool")).toBe("consulting {tool}");
  });
});

describe("buildWorkingPhrase", () => {
  it("returns a pool member for every (phase, level) combination", () => {
    for (const phase of PHASES) {
      for (const level of THINKING_LEVELS) {
        const pool = getPhrasePool(phase, level);
        for (const seed of [0, 0.5, 0.99]) {
          const phrase = buildWorkingPhrase({ phase, level, rng: () => seed });
          const expectedPool =
            phase === "other"
              ? pool.map((template) => formatPhasePhrase(template, "other", undefined))
              : pool;
          expect(expectedPool, `phase=${phase} level=${level} seed=${seed}`).toContain(phrase);
        }
      }
    }
  });

  it("substitutes the tool name into 'other' phrases", () => {
    const phrase = buildWorkingPhrase({
      phase: "other",
      level: "medium",
      toolName: "quantum_tool",
      rng: () => 0,
    });
    expect(phrase).toContain("quantum_tool");
    expect(phrase).not.toContain("{tool}");
  });

  it("is deterministic for a given rng", () => {
    const first = buildWorkingPhrase({ phase: "thinking", level: "high", rng: () => 0.42 });
    const second = buildWorkingPhrase({ phase: "thinking", level: "high", rng: () => 0.42 });
    expect(second).toBe(first);
  });

  it("never repeats the avoided phrase when alternatives exist", () => {
    const level: ThinkingLevel = "medium";
    const first = buildWorkingPhrase({ phase: "bash", level, rng: () => 0.25 });
    for (const seed of [0, 0.1, 0.3, 0.5, 0.7, 0.9, 0.99]) {
      const next = buildWorkingPhrase({
        phase: "bash",
        level,
        rng: () => seed,
        avoid: first,
      });
      expect(next).not.toBe(first);
    }
  });

  it("repeats the phrase for a single-entry pool even when avoided", () => {
    // 'edit' + 'minimal' has two entries; force the repeat by avoiding the
    // alternative so the pool effectively collapses.
    const pool = getPhrasePool("edit", "minimal");
    const other = pool[1]!;
    const phrase = buildWorkingPhrase({
      phase: "edit",
      level: "minimal",
      rng: () => 0,
      avoid: other,
    });
    expect(phrase).toBe(pool[0]);
  });
});
