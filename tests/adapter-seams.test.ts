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

const ELLIPSIS = "…";

type MessageFn = ReturnType<typeof vi.fn<(message?: string) => void>>;
type IndicatorFn = ReturnType<typeof vi.fn<(options?: unknown) => void>>;
type StatusFn = ReturnType<typeof vi.fn<(key: string, text?: string) => void>>;
type NotifyFn = ReturnType<
  typeof vi.fn<(message: string, type?: "info" | "warning" | "error") => void>
>;

interface FakeUi {
  setWorkingMessage: MessageFn;
  setWorkingIndicator: IndicatorFn;
  setStatus: StatusFn;
  notify: NotifyFn;
  theme: { fg: (color: string, text: string) => string };
}

interface FakeCtx {
  ui: FakeUi;
  thinkingLevel: string;
}

type Handler = (event: unknown, ctx: unknown) => unknown;
interface CommandDef {
  description?: string;
  handler: (args: string, ctx: unknown) => unknown;
}

interface FakePi {
  pi: unknown;
  handlers: Map<string, Handler[]>;
  commands: Map<string, CommandDef>;
  ctx: FakeCtx;
}

function createFakePi(thinkingLevel = "high"): FakePi {
  const handlers = new Map<string, Handler[]>();
  const commands = new Map<string, CommandDef>();
  const ctx: FakeCtx = {
    ui: {
      setWorkingMessage: vi.fn(),
      setWorkingIndicator: vi.fn(),
      setStatus: vi.fn(),
      notify: vi.fn(),
      theme: { fg: (color, text) => `[${color}]${text}` },
    },
    thinkingLevel,
  };
  const pi = {
    on: (event: string, handler: Handler) => {
      const list = handlers.get(event) ?? [];
      list.push(handler);
      handlers.set(event, list);
    },
    registerCommand: (name: string, def: CommandDef) => {
      commands.set(name, def);
    },
  };
  return { pi, handlers, commands, ctx };
}

function fire(fake: FakePi, event: string, payload: Record<string, unknown>): void {
  const list = fake.handlers.get(event);
  expect(list, `handler for ${event}`).toBeTruthy();
  for (const handler of list ?? []) {
    handler(payload, fake.ctx);
  }
}

function lastMessage(ui: FakeUi): string | undefined {
  const calls = ui.setWorkingMessage.mock.calls;
  if (calls.length === 0) {
    return undefined;
  }
  const last = calls[calls.length - 1] as (string | undefined)[];
  return last.length > 0 ? last[0] : undefined;
}

function commandHandler(fake: FakePi): (args: string, ctx: FakeCtx) => unknown {
  const handler = fake.commands.get("action-words")?.handler;
  expect(handler).toBeTruthy();
  return handler!;
}

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
