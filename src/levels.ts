/**
 * Thinking-level vocabulary.
 *
 * This module intentionally mirrors pi's `ThinkingLevel` (from
 * @earendil-works/pi-agent-core) with a local union so the phrase engine
 * stays framework-free and trivially unit-testable.
 */

export const THINKING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"] as const;

export type ThinkingLevel = (typeof THINKING_LEVELS)[number];

/** Level assumed when pi reports something we do not recognize. */
export const DEFAULT_THINKING_LEVEL: ThinkingLevel = "medium";

const KNOWN_LEVELS: ReadonlySet<string> = new Set<string>(THINKING_LEVELS);

/**
 * Normalize an arbitrary value (e.g. pi's `ctx.thinkingLevel`) into a known
 * thinking level. Unknown or non-string values fall back to
 * {@link DEFAULT_THINKING_LEVEL}.
 */
export function normalizeThinkingLevel(value: unknown): ThinkingLevel {
  if (typeof value === "string" && KNOWN_LEVELS.has(value)) {
    return value as ThinkingLevel;
  }
  return DEFAULT_THINKING_LEVEL;
}
