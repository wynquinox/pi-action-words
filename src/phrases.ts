/**
 * The phrase engine: fun working-message vocabulary, organized by
 * (action phase, thinking level).
 *
 * All pools are hand-written. Rules of the house:
 * - phrases are short, lowercase verb phrases (the renderer appends "…"),
 * - every (phase, level) cell has at least two distinct phrases,
 * - the `"other"` phase uses templates with a `{tool}` placeholder that is
 *   filled in with the actual tool name at render time.
 */

import { type ThinkingLevel } from "./levels.js";
import { type ActionPhase } from "./phases.js";
import { pickFromPool, type Rng } from "./picker.js";

/** Phrase pool per thinking level. */
export type LevelMap = Readonly<Record<ThinkingLevel, readonly string[]>>;

const THINKING_PHRASES: LevelMap = {
  off: [
    "on pure autopilot",
    "zipping along on reflexes",
    "skipping the deliberation department",
    "no-think mode engaged",
    "coasting on momentum",
  ],
  minimal: [
    "a quick mental once-over",
    "a glance, then go",
    "tapping the fast lane",
    "a light skim of the thought space",
    "minimal musing",
  ],
  low: [
    "mulling it over a bit",
    "turning it over lightly",
    "a casual ponder",
    "low-key deliberation in progress",
    "chewing on it, casually",
  ],
  medium: [
    "mulling it over",
    "churning the neurons",
    "working the kinks out",
    "thinking it through",
    "stirring the mental pot",
    "deliberating",
  ],
  high: [
    "thinking hard",
    "cranking the gears",
    "delving into the deep end",
    "reasoning with intent",
    "flexing the logic muscles",
    "deep focus engaged",
  ],
  xhigh: [
    "thinking really, really hard",
    "grinding the big gears",
    "bending a few dimensions",
    "wrestling the problem across 11 dimensions",
    "deep-dive in progress",
  ],
  max: [
    "warping spacetime",
    "pondering the cosmos",
    "consulting the 11th dimension",
    "maxing out the brain",
    "thinking at the speed of light",
    "summoning the deepest wisdom",
  ],
};

const BASH_PHRASES: LevelMap = {
  off: [
    "firing commands at the terminal",
    "winging it in the shell",
    "a blind-fast command",
    "the shell, on pure instinct",
  ],
  minimal: ["a quick shell poke", "a light tap on the terminal"],
  low: ["whispering to the shell", "nudging the command line", "a gentle command in the works"],
  medium: [
    "waving the shell wand",
    "talking to the terminal",
    "a command in flight",
    "running the play",
  ],
  high: [
    "wielding the command line",
    "channeling the shell",
    "orchestrating a command",
    "conducting the terminal",
  ],
  xhigh: [
    "summoning arcane shell incantations",
    "bending the terminal to its will",
    "invoking the command line",
  ],
  max: [
    "commanding the terminal like a demigod",
    "warping the shell itself",
    "speaking directly to the machine",
  ],
};

const READ_PHRASES: LevelMap = {
  off: ["glancing at lightning speed", "a blink-and-you-missed-it read", "speed-reading on fumes"],
  minimal: ["a quick once-over", "skimming the page", "a light peek"],
  low: ["having a look", "flipping through", "a casual browse"],
  medium: [
    "reading the fine print",
    "poring over the file",
    "studying the page",
    "absorbing the source",
  ],
  high: ["reading between the lines", "dissecting the source", "savoring every byte"],
  xhigh: ["squinting at the source", "close-reading like a professor", "unraveling every line"],
  max: ["decoding the sacred texts", "reading the file's soul", "gaining total comprehension"],
};

const WRITE_PHRASES: LevelMap = {
  off: ["scribbling at light speed", "ink before thought", "writing in one wild breath"],
  minimal: ["a quick jot", "dabbling on the page"],
  low: ["sketching a draft", "a light hand on the keyboard", "roughing it in"],
  medium: [
    "inscribing the file",
    "pouring code onto the page",
    "drafting away",
    "laying down the bytes",
  ],
  high: ["composing with care", "writing with intent", "laying the words precisely"],
  xhigh: ["etching the manuscript", "inscribing with precision", "carving the code"],
  max: ["channeling the words", "writing with the force", "dictating to the compiler"],
};

const EDIT_PHRASES: LevelMap = {
  off: ["touching it blindly", "a wild edit, full send"],
  minimal: ["a quick trim", "nipping a loose thread"],
  low: ["tidying up", "a light touch-up", "pruning the weeds"],
  medium: [
    "tweaking the bits",
    "polishing the edges",
    "surgical edits in progress",
    "adjusting the dials",
  ],
  high: ["performing code surgery", "sculpting the diff", "refining with precision"],
  xhigh: ["micro-sculpting the codebase", "redlining with intent", "shaving the nanoseconds"],
  max: [
    "reshaping reality, one hunk at a time",
    "conducting the edit orchestra",
    "rewriting the fabric of the repo",
  ],
};

const SEARCH_PHRASES: LevelMap = {
  off: ["snooping at warp speed", "pointing and hoping"],
  minimal: ["a quick peek around", "a light sniff"],
  low: ["rummaging about", "having a poke around", "casually nosing about"],
  medium: [
    "digging through the pile",
    "hunting for it",
    "combing the codebase",
    "sifting the haystack",
  ],
  high: ["tracking the trail", "hunting with focus", "following the breadcrumbs"],
  xhigh: ["interrogating the codebase", "sifting through every cranny", "closing in on the needle"],
  max: [
    "scrying through the entire repo",
    "unearthing the buried needle",
    "seeing through the haystack",
  ],
};

/**
 * Templates for unknown/custom tools. `{tool}` is replaced with the tool
 * name at render time.
 */
const OTHER_TEMPLATES: LevelMap = {
  off: ["firing {tool} on pure instinct", "winging {tool}"],
  minimal: ["a quick {tool} poke", "tapping {tool} lightly"],
  low: ["nudging {tool} along", "trying {tool} on for size"],
  medium: ["consulting {tool}", "working {tool} the old way", "giving {tool} a go"],
  high: ["channeling {tool}", "deep-diving with {tool}"],
  xhigh: ["wrestling with {tool}", "summoning the power of {tool}"],
  max: ["communing with {tool}", "unleashing {tool} upon the cosmos"],
};

const PHASE_PHRASES: Readonly<Record<Exclude<ActionPhase, "other">, LevelMap>> = {
  thinking: THINKING_PHRASES,
  bash: BASH_PHRASES,
  read: READ_PHRASES,
  write: WRITE_PHRASES,
  edit: EDIT_PHRASES,
  search: SEARCH_PHRASES,
};

/** The phrase pool (or template pool, for `"other"`) for a phase + level. */
export function getPhrasePool(phase: ActionPhase, level: ThinkingLevel): readonly string[] {
  if (phase === "other") {
    return OTHER_TEMPLATES[level];
  }
  return PHASE_PHRASES[phase][level];
}

/**
 * Fill in the `{tool}` placeholder for the `"other"` phase. Other phases are
 * returned unchanged. Missing/empty tool names render as "the tool".
 */
export function formatPhasePhrase(phrase: string, phase: ActionPhase, toolName?: string): string {
  if (phase !== "other") {
    return phrase;
  }
  const name = toolName && toolName.length > 0 ? toolName : "the tool";
  return phrase.replaceAll("{tool}", name);
}

export interface WorkingPhraseOptions {
  phase: ActionPhase;
  level: ThinkingLevel;
  /** Tool name, only used when phase is `"other"`. */
  toolName?: string;
  /** Previously shown phrase (for this phase+level) to avoid repeating. */
  avoid?: string;
  /** Injectable random source (defaults to `Math.random`). */
  rng?: Rng;
}

/**
 * Pick a fun working phrase for the given phase and thinking level.
 *
 * Returns the formatted phrase (for `"other"`, the tool name is substituted)
 * without any trailing punctuation — the renderer appends the ellipsis.
 */
export function buildWorkingPhrase(options: WorkingPhraseOptions): string {
  const pool = getPhrasePool(options.phase, options.level);
  const phrase = pickFromPool(pool, options.rng ?? Math.random, options.avoid);
  return formatPhasePhrase(phrase, options.phase, options.toolName);
}
