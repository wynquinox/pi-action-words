import { describe, expect, it } from "vitest";

import { pickFromPool } from "../src/picker.js";

describe("pickFromPool", () => {
  it("throws on an empty pool", () => {
    expect(() => pickFromPool([])).toThrow(/must not be empty/);
  });

  it("returns the only entry of a single-element pool", () => {
    expect(pickFromPool(["solo"], () => 0.5)).toBe("solo");
  });

  it("returns the single entry even when it is the avoided one", () => {
    expect(pickFromPool(["solo"], () => 0.5, "solo")).toBe("solo");
  });

  it("always returns a member of the pool", () => {
    const pool = ["a", "b", "c", "d"];
    for (const seed of [0, 0.1, 0.25, 0.499, 0.5, 0.75, 0.9, 0.999]) {
      expect(pool).toContain(pickFromPool(pool, () => seed));
    }
  });

  it("is deterministic for a given rng sequence", () => {
    const pool = ["a", "b", "c"];
    let i = 0;
    const sequence = [0.1, 0.5, 0.9];
    const rng = () => sequence[i++ % sequence.length]!;
    expect(pickFromPool(pool, rng)).toBe("a");
    expect(pickFromPool(pool, rng)).toBe("b");
    expect(pickFromPool(pool, rng)).toBe("c");
  });

  it("picks the last element when rng returns just under 1", () => {
    expect(pickFromPool(["a", "b", "c"], () => 0.999)).toBe("c");
  });

  it("never returns the avoided entry when another entry exists", () => {
    const pool = ["a", "b", "c"];
    for (const seed of [0, 0.2, 0.4, 0.6, 0.8, 0.99]) {
      const picked = pickFromPool(pool, () => seed, "a");
      expect(picked).not.toBe("a");
      expect(pool).toContain(picked);
    }
  });

  it("picks from the full pool when the avoided entry is not in it", () => {
    // Without avoidance, rng 0.999 -> index 2 -> "c"; avoidance of "z" must not
    // change the outcome.
    expect(pickFromPool(["a", "b", "c"], () => 0.999, "z")).toBe("c");
  });

  it("clamps out-of-range and non-finite rng values instead of throwing", () => {
    const pool = ["a", "b", "c"];
    for (const bad of [-1, -0.5, 1, 2, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(pool).toContain(pickFromPool(pool, () => bad));
    }
  });
});
