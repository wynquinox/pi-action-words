import { describe, expect, it } from "vitest";

import { buildIndicator, getPhaseFrames, type IndicatorOptions } from "../src/indicators.js";
import { PHASES } from "../src/phases.js";

describe("getPhaseFrames", () => {
  it("returns non-empty frames for every phase", () => {
    for (const phase of PHASES) {
      const frames = getPhaseFrames(phase);
      expect(frames.length, phase).toBeGreaterThan(0);
      for (const frame of frames) {
        expect(typeof frame).toBe("string");
        expect(frame.length).toBeGreaterThan(0);
      }
    }
  });

  it("returns distinct frames within each phase", () => {
    for (const phase of PHASES) {
      const frames = getPhaseFrames(phase);
      expect(new Set(frames).size, phase).toBe(frames.length);
    }
  });
});

describe("buildIndicator", () => {
  const colorize = (text: string): string => `[${text}]`;

  it("applies the colorize function to every frame", () => {
    for (const phase of PHASES) {
      const indicator = buildIndicator(phase, colorize);
      const raw = getPhaseFrames(phase);
      expect(indicator.frames, phase).toEqual(raw.map((frame) => `[${frame}]`));
    }
  });

  it("sets a positive intervalMs for every phase", () => {
    for (const phase of PHASES) {
      const indicator = buildIndicator(phase, (text) => text);
      expect(typeof indicator.intervalMs, phase).toBe("number");
      expect(indicator.intervalMs!).toBeGreaterThan(0);
    }
  });

  it("returns a fresh frames array on each call (no shared mutable state)", () => {
    const first = buildIndicator("bash", (text) => text);
    first.frames!.push("tampered");
    const second = buildIndicator("bash", (text) => text);
    expect(second.frames).not.toContain("tampered");
  });

  it("returns an object that satisfies pi's WorkingIndicatorOptions shape", () => {
    const indicator: IndicatorOptions = buildIndicator("thinking", (text) => text);
    expect(Array.isArray(indicator.frames)).toBe(true);
    expect(indicator.frames!.every((frame) => typeof frame === "string")).toBe(true);
  });
});
