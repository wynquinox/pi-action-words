/**
 * Per-phase working indicators (the little animated glyph next to the
 * working message).
 *
 * pi renders custom frames verbatim, so the caller is responsible for
 * applying theme colors — {@link buildIndicator} does that through the
 * `colorize` callback.
 */

import type { ActionPhase } from "./phases.js";

/** Structural mirror of pi's `WorkingIndicatorOptions`. */
export interface IndicatorOptions {
  /** Animation frames; an empty array hides the indicator entirely. */
  frames?: string[];
  /** Frame interval in milliseconds for animated indicators. */
  intervalMs?: number;
}

/** Applies a color/style to one indicator frame. */
export type Colorize = (text: string) => string;

const FRAMES: Readonly<Record<ActionPhase, readonly string[]>> = {
  thinking: ["🤔", "💭", "🧠", "💡"],
  bash: ["⌨️", "🔥", "💥"],
  read: ["👀", "📖", "🔎"],
  write: ["✍️", "📝", "⚡"],
  edit: ["🛠️", "🔧", "✂️"],
  search: ["🔍", "🕵️", "📡"],
  other: ["✨", "🪄"],
};

const INTERVALS_MS: Readonly<Record<ActionPhase, number>> = {
  thinking: 160,
  bash: 130,
  read: 150,
  write: 150,
  edit: 140,
  search: 130,
  other: 150,
};

/** Raw (un-colored) frames for a phase. */
export function getPhaseFrames(phase: ActionPhase): readonly string[] {
  return FRAMES[phase];
}

/** Build ready-to-render indicator options for a phase, frames colored. */
export function buildIndicator(phase: ActionPhase, colorize: Colorize): IndicatorOptions {
  return {
    frames: [...FRAMES[phase]].map((frame) => colorize(frame)),
    intervalMs: INTERVALS_MS[phase],
  };
}
