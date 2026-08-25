/**
 * Deterministic adapter tests: the phrase engine is mocked so these tests can
 * assert exactly what src/index.ts passes to it — phase, level, tool name, and
 * the `avoid` dedup state. The real engine is random and only checkable against
 * pools, so the event wiring and state machine get their coverage here.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Only `buildWorkingPhrase` is consumed by src/index.ts (and by this file),
// so the mock module only needs to provide that one export.
vi.mock("../src/phrases.js", () => ({
  buildWorkingPhrase: vi.fn(),
}));

import actionWords from "../src/index.js";
import { buildWorkingPhrase } from "../src/phrases.js";

import { commandHandler, createFakePi, ELLIPSIS, fire, lastMessage } from "./mocks/mock-pi.js";

describe("adapter <-> phrase engine seams (mocked engine)", () => {
  const engine = vi.mocked(buildWorkingPhrase);

  beforeEach(() => {
    engine.mockReset();
  });

  it("passes the last shown phrase as `avoid` so the engine never repeats it", () => {
    const fake = createFakePi("medium");
    engine.mockImplementation((opts) => (opts.avoid ? "SECOND" : "FIRST"));
    actionWords(fake.pi as ExtensionAPI);

    fire(fake, "session_start", { reason: "startup" });
    expect(lastMessage(fake.ctx.ui)).toBe(`FIRST${ELLIPSIS}`);
    expect(engine).toHaveBeenLastCalledWith({
      phase: "thinking",
      level: "medium",
      toolName: undefined,
      avoid: undefined,
    });

    // Same phase+level again: the engine must be told what was just shown.
    fire(fake, "thinking_level_select", { level: "medium", previousLevel: "medium" });
    expect(lastMessage(fake.ctx.ui)).toBe(`SECOND${ELLIPSIS}`);
    expect(engine).toHaveBeenLastCalledWith({
      phase: "thinking",
      level: "medium",
      toolName: undefined,
      avoid: "FIRST",
    });
  });

  it("forgets remembered phrases when the agent run ends", () => {
    const fake = createFakePi("medium");
    engine.mockImplementation((opts) => (opts.avoid ? "SECOND" : "FIRST"));
    actionWords(fake.pi as ExtensionAPI);

    fire(fake, "session_start", { reason: "startup" });
    expect(lastMessage(fake.ctx.ui)).toBe(`FIRST${ELLIPSIS}`);

    fire(fake, "agent_end", {});

    // A fresh run must start with a clean slate, not avoid old phrases.
    fire(fake, "session_start", { reason: "startup" });
    expect(lastMessage(fake.ctx.ui)).toBe(`FIRST${ELLIPSIS}`);
    expect(engine).toHaveBeenLastCalledWith(expect.objectContaining({ avoid: undefined }));
  });

  it("reports a clean 'thinking' phase on agent_start even with a tool in flight", () => {
    const fake = createFakePi();
    engine.mockImplementation((opts) => opts.phase);
    actionWords(fake.pi as ExtensionAPI);

    fire(fake, "agent_start", {});
    expect(lastMessage(fake.ctx.ui)).toBe(`thinking${ELLIPSIS}`);

    fire(fake, "tool_execution_start", { toolCallId: "t1", toolName: "bash" });
    expect(lastMessage(fake.ctx.ui)).toBe(`bash${ELLIPSIS}`);

    // A new agent run resets the tracker and must push a fresh message.
    fire(fake, "agent_start", {});
    expect(lastMessage(fake.ctx.ui)).toBe(`thinking${ELLIPSIS}`);
    expect(engine).toHaveBeenLastCalledWith(expect.objectContaining({ phase: "thinking" }));
  });

  it("session_start also resets tool state", () => {
    const fake = createFakePi();
    engine.mockImplementation((opts) => opts.phase);
    actionWords(fake.pi as ExtensionAPI);

    fire(fake, "agent_start", {});
    fire(fake, "tool_execution_start", { toolCallId: "t1", toolName: "bash" });
    expect(lastMessage(fake.ctx.ui)).toBe(`bash${ELLIPSIS}`);

    fire(fake, "session_start", { reason: "restart" });
    expect(lastMessage(fake.ctx.ui)).toBe(`thinking${ELLIPSIS}`);
    expect(engine).toHaveBeenLastCalledWith(expect.objectContaining({ phase: "thinking" }));
  });

  it("agent_end resets tool state for the next run", () => {
    const fake = createFakePi();
    engine.mockImplementation((opts) => opts.phase);
    actionWords(fake.pi as ExtensionAPI);

    fire(fake, "agent_start", {});
    fire(fake, "tool_execution_start", { toolCallId: "t1", toolName: "bash" });
    expect(lastMessage(fake.ctx.ui)).toBe(`bash${ELLIPSIS}`);

    fire(fake, "agent_end", {});
    expect(lastMessage(fake.ctx.ui)).toBeUndefined();

    // Anything that applies a phrase before the next agent_start (e.g. a level
    // change between runs) must already see a clean tracker — the stale tool
    // must not keep the phase on "bash".
    fire(fake, "thinking_level_select", { level: "high", previousLevel: "medium" });
    expect(lastMessage(fake.ctx.ui)).toBe(`thinking${ELLIPSIS}`);
    expect(engine).toHaveBeenLastCalledWith(expect.objectContaining({ phase: "thinking" }));
  });

  it("the test command injects a fake tool name only for the 'other' phase", async () => {
    const fake = createFakePi("high");
    engine.mockImplementation(() => "SAMPLE");
    actionWords(fake.pi as ExtensionAPI);
    const handler = commandHandler(fake);

    await handler("test other", fake.ctx);
    expect(engine).toHaveBeenLastCalledWith(
      expect.objectContaining({ phase: "other", toolName: "mystery_tool", level: "high" }),
    );

    await handler("test bash", fake.ctx);
    expect(engine).toHaveBeenLastCalledWith(
      expect.objectContaining({ phase: "bash", toolName: undefined, level: "high" }),
    );
  });
});
