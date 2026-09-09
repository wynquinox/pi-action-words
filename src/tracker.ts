import { mapToolToPhase, type ActionPhase } from "./phases.js";

interface ActiveTool {
  phase: ActionPhase;
  toolName: string;
}

/**
 * Tracks in-flight tool executions so the working message reflects the right
 * phase even while parallel tool calls overlap:
 *
 * - while any tool is running, the phase is that of the most recently
 *   started tool still in flight;
 * - when no tool is in flight, the phase is `"thinking"` (the LLM is
 *   generating again).
 */
export class WorkingPhaseTracker {
  private readonly active = new Map<string, ActiveTool>();

  /** Drop all in-flight state (e.g. when a new agent run starts). */
  reset(): void {
    this.active.clear();
  }

  /** Record that a tool call started. */
  toolStarted(toolCallId: string, toolName: string): void {
    this.active.set(toolCallId, { phase: mapToolToPhase(toolName), toolName });
  }

  /** Record that a tool call finished; returns the phase to show now. */
  toolEnded(toolCallId: string): ActionPhase {
    this.active.delete(toolCallId);
    return this.currentPhase();
  }

  /** Phase of the most recently started tool still in flight, else "thinking". */
  currentPhase(): ActionPhase {
    return this.latest()?.phase ?? "thinking";
  }

  /** Tool name backing {@link currentPhase}; undefined while idle. */
  currentToolName(): string | undefined {
    return this.latest()?.toolName;
  }

  /** Number of tool calls currently in flight. */
  get inFlightCount(): number {
    return this.active.size;
  }

  private latest(): ActiveTool | undefined {
    // Map iteration order is insertion order, so the last value is the most
    // recently started tool still in flight.
    return [...this.active.values()].at(-1);
  }
}
