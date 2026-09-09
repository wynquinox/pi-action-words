/**
 * Action phases — the "what is pi doing right now" axis of phrase selection.
 */

export type ActionPhase =
  | "thinking" // LLM is generating (reasoning or writing the response)
  | "bash" // running a shell command
  | "read" // reading a file
  | "write" // writing/creating a file
  | "edit" // editing a file
  | "search" // searching/grepping/fetching content
  | "other"; // any other (custom) tool

/** All phases, in display order. */
export const PHASES: readonly ActionPhase[] = [
  "thinking",
  "bash",
  "read",
  "write",
  "edit",
  "search",
  "other",
];

/** Human-readable label for each phase (used in command output). */
export const PHASE_LABELS: Readonly<Record<ActionPhase, string>> = {
  thinking: "thinking",
  bash: "running a command",
  read: "reading a file",
  write: "writing a file",
  edit: "editing a file",
  search: "searching",
  other: "using a tool",
};

const TOOL_PHASES: Readonly<Record<string, ActionPhase>> = {
  bash: "bash",
  read: "read",
  write: "write",
  edit: "edit",
  grep: "search",
  find: "search",
  ls: "search",
  search: "search",
  web_search: "search",
  source_check: "search",
  fetch_content: "search",
  get_search_content: "search",
  session_search: "search",
  memory_search: "search",
};

/**
 * Map a tool name to the action phase it represents. Unknown tools (custom
 * tools, renamed tools, future built-ins) map to `"other"`.
 */
export function mapToolToPhase(toolName: string): ActionPhase {
  return TOOL_PHASES[toolName] ?? "other";
}

/** Type guard for arbitrary strings (e.g. command arguments). */
export function isActionPhase(value: string): value is ActionPhase {
  return (PHASES as readonly string[]).includes(value);
}
