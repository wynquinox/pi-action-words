/**
 * action-words — pi extension
 *
 * Replaces the default "Working..." indicator with fun action words chosen
 * by (action phase, thinking level):
 *
 * - `agent_start` / `tool_execution_end`  → "thinking" phase
 * - `tool_execution_start`                → phase mapped from the tool name
 * - `thinking_level_select`               → new level takes effect immediately
 * - `agent_end`                           → pi's defaults are restored
 *
 * The phrase engine lives in pure modules (phases.ts, levels.ts, phrases.ts,
 * picker.ts, indicators.ts, tracker.ts) and is covered by unit tests; this
 * file is only the thin adapter that binds events to the pi UI.
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

import { buildIndicator } from "./indicators.js";
import {
  DEFAULT_THINKING_LEVEL,
  normalizeThinkingLevel,
  THINKING_LEVELS,
  type ThinkingLevel,
} from "./levels.js";
import { isActionPhase, PHASES, PHASE_LABELS } from "./phases.js";
import { buildWorkingPhrase } from "./phrases.js";
import { WorkingPhaseTracker } from "./tracker.js";

const STATUS_KEY = "action-words";
const ELLIPSIS = "…";

export default function actionWords(pi: ExtensionAPI): void {
  const tracker = new WorkingPhaseTracker();
  let enabled = true;
  let level: ThinkingLevel = DEFAULT_THINKING_LEVEL;
  /** Last phrase shown per `${phase}:${level}` key, to avoid repeats. */
  const lastPhrases = new Map<string, string>();

  const describe = (): string => `action words ${enabled ? "on" : "off"} (level: ${level})`;

  /** Pick a phrase for the current phase/level and push it to the working UI. */
  const apply = (ctx: ExtensionContext): void => {
    if (!enabled) {
      return;
    }
    // Always trust the live context for the effective thinking level.
    level = normalizeThinkingLevel(ctx.thinkingLevel);
    const phase = tracker.currentPhase();
    const key = `${phase}:${level}`;
    const phrase = buildWorkingPhrase({
      phase,
      level,
      toolName: tracker.currentToolName(),
      avoid: lastPhrases.get(key),
    });
    lastPhrases.set(key, phrase);
    ctx.ui.setWorkingMessage(`${phrase}${ELLIPSIS}`);
    ctx.ui.setWorkingIndicator(buildIndicator(phase, (text) => ctx.ui.theme.fg("accent", text)));
  };

  /** Restore pi's default working message and indicator. */
  const restoreDefaults = (ctx: ExtensionContext): void => {
    ctx.ui.setWorkingMessage();
    ctx.ui.setWorkingIndicator();
    lastPhrases.clear();
  };

  const updateStatus = (ctx: ExtensionContext): void => {
    ctx.ui.setStatus(STATUS_KEY, ctx.ui.theme.fg("dim", describe()));
  };

  pi.on("session_start", (_event, ctx) => {
    level = normalizeThinkingLevel(ctx.thinkingLevel);
    tracker.reset();
    apply(ctx);
    updateStatus(ctx);
  });

  pi.on("thinking_level_select", (_event, ctx) => {
    // ctx.thinkingLevel already reflects the new level; apply() syncs it.
    apply(ctx);
    updateStatus(ctx);
  });

  pi.on("agent_start", (_event, ctx) => {
    tracker.reset();
    apply(ctx);
  });

  pi.on("tool_execution_start", (event, ctx) => {
    tracker.toolStarted(event.toolCallId, event.toolName);
    apply(ctx);
  });

  pi.on("tool_execution_end", (event, ctx) => {
    tracker.toolEnded(event.toolCallId);
    apply(ctx);
  });

  pi.on("agent_end", (_event, ctx) => {
    tracker.reset();
    restoreDefaults(ctx);
    updateStatus(ctx);
  });

  pi.registerCommand("action-words", {
    description:
      "Fun action words for the working indicator. Usage: /action-words [on|off|list|test <phase>]",
    handler: async (args, ctx) => {
      level = normalizeThinkingLevel(ctx.thinkingLevel);
      const parts = args.trim().split(/\s+/);
      const arg = parts[0]?.toLowerCase() ?? "";

      if (arg === "") {
        const phase = tracker.currentPhase();
        const sample = buildWorkingPhrase({
          phase,
          level,
          toolName: tracker.currentToolName(),
        });
        ctx.ui.notify(`🎬 ${describe()} — now: "${sample}${ELLIPSIS}"`, "info");
        return;
      }

      if (arg === "on" || arg === "off") {
        enabled = arg === "on";
        if (enabled) {
          apply(ctx);
        } else {
          restoreDefaults(ctx);
        }
        updateStatus(ctx);
        ctx.ui.notify(`Action words ${enabled ? "enabled" : "disabled"}.`, "info");
        return;
      }

      if (arg === "list") {
        const phaseList = PHASES.map((phase) => `${phase} (${PHASE_LABELS[phase]})`).join(", ");
        ctx.ui.notify(`Phases: ${phaseList}\nLevels: ${THINKING_LEVELS.join(", ")}`, "info");
        return;
      }

      if (arg === "test") {
        const phaseArg = parts[1]?.toLowerCase();
        if (phaseArg !== undefined && !isActionPhase(phaseArg)) {
          ctx.ui.notify(`Unknown phase "${phaseArg}". Phases: ${PHASES.join(", ")}`, "error");
          return;
        }
        const phase = phaseArg ?? "thinking";
        const toolName = phase === "other" ? "mystery_tool" : undefined;
        const sample = buildWorkingPhrase({ phase, level, toolName });
        ctx.ui.notify(`🎬 [${level}/${phase}] "${sample}${ELLIPSIS}"`, "info");
        return;
      }

      ctx.ui.notify("Usage: /action-words [on|off|list|test <phase>]", "error");
    },
  });
}
