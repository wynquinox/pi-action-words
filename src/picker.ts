/**
 * Random selection with "don't repeat the last pick" behavior.
 *
 * Pure and dependency-free: the random source is injectable so tests can
 * drive it deterministically.
 */

/** Random source; anything `Math.random`-compatible (returns [0, 1)). */
export type Rng = () => number;

/**
 * Pick a random entry from a non-empty pool.
 *
 * - `avoid` (when given and present in the pool) is never returned as long as
 *   the pool has at least two distinct entries.
 * - Out-of-range or non-finite values from `rng` are clamped, never thrown on.
 * - Pool entries must not be `undefined`.
 *
 * @throws {Error} if the pool is empty.
 */
export function pickFromPool<T>(pool: readonly T[], rng: Rng = Math.random, avoid?: T): T {
  if (pool.length === 0) {
    throw new Error("pickFromPool: pool must not be empty");
  }
  const candidates = pool.filter((item) => item !== avoid);
  const effective = candidates.length > 0 ? candidates : pool;
  const index = clampIndex(rng(), effective.length);
  return effective[index] as T;
}

/** Convert a raw rng value into a safe array index in `[0, length)`. */
function clampIndex(value: number, length: number): number {
  const safe = Number.isFinite(value) ? value : 0;
  const unit = Math.min(Math.max(safe, 0), 1 - Number.EPSILON);
  return Math.floor(unit * length) % length;
}
