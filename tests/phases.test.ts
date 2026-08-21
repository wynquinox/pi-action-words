import { describe, expect, it } from "vitest";

import { mapToolToPhase, PHASES, PHASE_LABELS, type ActionPhase } from "../src/phases.js";

describe("mapToolToPhase", () => {
  const BUILTIN_TOOL_CASES: [string, ActionPhase][] = [
    ["bash", "bash"],
    ["read", "read"],
    ["write", "write"],
    ["edit", "edit"],
    ["grep", "search"],
    ["find", "search"],
    ["ls", "search"],
    ["search", "search"],
    ["web_search", "search"],
    ["source_check", "search"],
    ["fetch_content", "search"],
    ["get_search_content", "search"],
    ["session_search", "search"],
    ["memory_search", "search"],
  ];

  it.each(BUILTIN_TOOL_CASES)("maps %s to %s", (toolName, phase) => {
    expect(mapToolToPhase(toolName)).toBe(phase);
  });

  it("maps unknown tools to 'other'", () => {
    expect(mapToolToPhase("greet")).toBe("other");
    expect(mapToolToPhase("my_custom_tool")).toBe("other");
    expect(mapToolToPhase("Bash")).toBe("other"); // case-sensitive, like real tool names
  });

  it("maps an empty tool name to 'other'", () => {
    expect(mapToolToPhase("")).toBe("other");
  });
});

describe("PHASES", () => {
  it("contains every ActionPhase exactly once", () => {
    const sorted = [...PHASES].sort();
    expect(sorted).toEqual(["bash", "edit", "other", "read", "search", "thinking", "write"].sort());
    expect(new Set(PHASES).size).toBe(PHASES.length);
  });

  it("has a label for every phase", () => {
    for (const phase of PHASES) {
      expect(PHASE_LABELS[phase]).toBeTruthy();
      expect(typeof PHASE_LABELS[phase]).toBe("string");
    }
  });
});
