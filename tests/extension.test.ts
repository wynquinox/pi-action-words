/**
 * Integration test for the extension adapter (src/index.ts): drives a mock
 * ExtensionAPI through a realistic event sequence and asserts the working
 * message/indicator calls that get made.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { describe, expect, it, vi } from "vitest";

import actionWords from "../src/index.js";
import { THINKING_LEVELS, type ThinkingLevel } from "../src/levels.js";
import { PHASES, PHASE_LABELS } from "../src/phases.js";
import { buildWorkingPhrase, getPhrasePool } from "../src/phrases.js";

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

/** Last message argument passed to setWorkingMessage (undefined for reset/no call). */
function lastMessage(ui: FakeUi): string | undefined {
  const calls = ui.setWorkingMessage.mock.calls;
  if (calls.length === 0) {
    return undefined;
  }
  const last = calls[calls.length - 1] as (string | undefined)[];
  return last.length > 0 ? last[0] : undefined;
}

function phrasePart(message: string | undefined): string | undefined {
  if (message === undefined) {
    return undefined;
  }
  expect(message.endsWith(ELLIPSIS)).toBe(true);
  return message.slice(0, -ELLIPSIS.length);
}

function poolContains(pool: readonly string[], phrase: string | undefined): void {
  expect(phrase).toBeTruthy();
  expect(pool).toContain(phrase!);
}

describe("action-words extension adapter", () => {
  it("registers the /action-words command", () => {
    const fake = createFakePi();
    actionWords(fake.pi as ExtensionAPI);
    expect(fake.commands.has("action-words")).toBe(true);
    expect(fake.commands.get("action-words")?.description).toContain("/action-words");
  });

  it("walks through a full agent run with the right phases and levels", () => {
    const fake = createFakePi("high");
    actionWords(fake.pi as ExtensionAPI);
    const ui = fake.ctx.ui;

    fire(fake, "session_start", { reason: "startup" });
    poolContains(getPhrasePool("thinking", "high"), phrasePart(lastMessage(ui)));
    expect(ui.setStatus).toHaveBeenCalledTimes(1);
    expect(ui.setStatus).toHaveBeenLastCalledWith(
      "action-words",
      "[dim]action words on (level: high)",
    );

    fire(fake, "agent_start", {});
    const thinking1 = lastMessage(ui);
    poolContains(getPhrasePool("thinking", "high"), phrasePart(thinking1));

    // Tool starts: phase follows the tool.
    fire(fake, "tool_execution_start", { toolCallId: "t1", toolName: "bash" });
    poolContains(getPhrasePool("bash", "high"), phrasePart(lastMessage(ui)));

    // Parallel tool: phase follows the most recent one.
    fire(fake, "tool_execution_start", { toolCallId: "t2", toolName: "grep" });
    poolContains(getPhrasePool("search", "high"), phrasePart(lastMessage(ui)));

    // First tool ends, second still in flight: phase stays.
    fire(fake, "tool_execution_end", { toolCallId: "t1" });
    poolContains(getPhrasePool("search", "high"), phrasePart(lastMessage(ui)));

    // Second tool ends: back to thinking, without repeating the prior phrase.
    fire(fake, "tool_execution_end", { toolCallId: "t2" });
    const thinking2 = lastMessage(ui);
    poolContains(getPhrasePool("thinking", "high"), phrasePart(thinking2));
    expect(thinking2).not.toBe(thinking1);

    // Thinking level change takes effect immediately. (In real pi the context
    // already reports the new level by the time the event fires.)
    fake.ctx.thinkingLevel = "max";
    fire(fake, "thinking_level_select", { level: "max", previousLevel: "high" });
    poolContains(getPhrasePool("thinking", "max"), phrasePart(lastMessage(ui)));
    expect(ui.setStatus).toHaveBeenCalledTimes(2);

    // Run ends: pi defaults restored (called with no arguments).
    fire(fake, "agent_end", {});
    expect(lastMessage(ui)).toBeUndefined();
    expect(ui.setStatus).toHaveBeenCalledTimes(3);
    const indicatorCalls = ui.setWorkingIndicator.mock.calls;
    expect(indicatorCalls[indicatorCalls.length - 1]).toEqual([]);
  });

  it("uses the 'other' phase with the tool name for custom tools", () => {
    const fake = createFakePi("medium");
    actionWords(fake.pi as ExtensionAPI);
    const ui = fake.ctx.ui;

    fire(fake, "agent_start", {});
    fire(fake, "tool_execution_start", { toolCallId: "t1", toolName: "quantum_tool" });

    const message = lastMessage(ui);
    poolContains(
      getPhrasePool("other", "medium").map((template) =>
        template.replaceAll("{tool}", "quantum_tool"),
      ),
      phrasePart(message),
    );
    expect(message).toContain("quantum_tool");
  });

  it("ignores end events for unknown tool call ids", () => {
    const fake = createFakePi("low");
    actionWords(fake.pi as ExtensionAPI);
    const ui = fake.ctx.ui;

    fire(fake, "agent_start", {});
    fire(fake, "tool_execution_start", { toolCallId: "t1", toolName: "read" });
    fire(fake, "tool_execution_end", { toolCallId: "ghost" });
    poolContains(getPhrasePool("read", "low"), phrasePart(lastMessage(ui)));
  });

  it("normalizes an unknown thinking level from ctx to the default", () => {
    const fake = createFakePi("ultra");
    actionWords(fake.pi as ExtensionAPI);
    const ui = fake.ctx.ui;

    fire(fake, "session_start", { reason: "startup" });
    poolContains(getPhrasePool("thinking", "medium"), phrasePart(lastMessage(ui)));
  });

  it("disables and re-enables via the command", async () => {
    const fake = createFakePi("medium");
    actionWords(fake.pi as ExtensionAPI);
    const ui = fake.ctx.ui;
    const handler = fake.commands.get("action-words")?.handler;
    expect(handler).toBeTruthy();

    fire(fake, "session_start", { reason: "startup" });

    await handler!("off", fake.ctx);
    expect(lastMessage(ui)).toBeUndefined();
    expect(ui.notify).toHaveBeenLastCalledWith("Action words disabled.", "info");
    expect(ui.setStatus).toHaveBeenLastCalledWith(
      "action-words",
      "[dim]action words off (level: medium)",
    );

    // While disabled, events must not touch the working message.
    const callsSoFar = ui.setWorkingMessage.mock.calls.length;
    fire(fake, "agent_start", {});
    expect(ui.setWorkingMessage.mock.calls.length).toBe(callsSoFar);

    await handler!("on", fake.ctx);
    // Re-enabling must restore the working message immediately, without
    // waiting for the next event.
    expect(lastMessage(ui)).toBeTruthy();
    expect(ui.notify).toHaveBeenLastCalledWith("Action words enabled.", "info");
    expect(ui.setStatus).toHaveBeenLastCalledWith(
      "action-words",
      "[dim]action words on (level: medium)",
    );
    fire(fake, "agent_start", {});
    poolContains(getPhrasePool("thinking", "medium"), phrasePart(lastMessage(ui)));
  });

  it("answers the info, list, and test commands", async () => {
    const fake = createFakePi("high");
    actionWords(fake.pi as ExtensionAPI);
    const ui = fake.ctx.ui;
    const handler = fake.commands.get("action-words")?.handler;
    expect(handler).toBeTruthy();

    await handler!("", fake.ctx);
    expect(ui.notify).toHaveBeenLastCalledWith(expect.stringContaining("action words on"), "info");

    await handler!("list", fake.ctx);
    const listMessage = ui.notify.mock.calls.at(-1)?.[0] ?? "";
    expect(listMessage).toContain("Phases:");
    for (const phase of PHASES) {
      expect(listMessage).toContain(`${phase} (${PHASE_LABELS[phase]})`);
    }
    for (const level of THINKING_LEVELS) {
      expect(listMessage).toContain(level);
    }
    expect(listMessage).not.toContain("undefined");

    for (const phase of ["bash", "edit", "other"]) {
      await handler!(`test ${phase}`, fake.ctx);
      const message = ui.notify.mock.calls.at(-1)?.[0];
      expect(message).toContain(`[high/${phase}]`);
    }

    // The "other" sample must carry the fake tool name; real phases must not.
    await handler!("test other", fake.ctx);
    expect(ui.notify.mock.calls.at(-1)?.[0]).toContain("mystery_tool");
    await handler!("test bash", fake.ctx);
    expect(ui.notify.mock.calls.at(-1)?.[0]).not.toContain("mystery_tool");

    await handler!("test wibble", fake.ctx);
    expect(ui.notify).toHaveBeenLastCalledWith(expect.stringContaining("Unknown phase"), "error");

    await handler!("bogus", fake.ctx);
    expect(ui.notify).toHaveBeenLastCalledWith(expect.stringContaining("Usage:"), "error");
  });

  it("tolerates irregular whitespace in command arguments", async () => {
    const fake = createFakePi("high");
    actionWords(fake.pi as ExtensionAPI);
    const ui = fake.ctx.ui;
    const handler = fake.commands.get("action-words")?.handler;
    expect(handler).toBeTruthy();

    await handler!("  test    other  ", fake.ctx);
    expect(ui.notify).toHaveBeenLastCalledWith(expect.stringContaining("[high/other]"), "info");
    expect(ui.notify.mock.calls.at(-1)?.[0]).toContain("mystery_tool");
  });

  it("always emits well-formed phrases (non-empty, with ellipsis)", () => {
    const fake = createFakePi("xhigh");
    actionWords(fake.pi as ExtensionAPI);
    const ui = fake.ctx.ui;

    fire(fake, "agent_start", {});
    for (const tool of ["bash", "read", "write", "edit", "ls", "custom_thing"]) {
      fire(fake, "tool_execution_start", { toolCallId: `t-${tool}`, toolName: tool });
      fire(fake, "tool_execution_end", { toolCallId: `t-${tool}` });
      const message = lastMessage(ui);
      expect(message).toBeTruthy();
      expect(message!.length).toBeGreaterThan(ELLIPSIS.length + 3);
      expect(phrasePart(message)).toBeTruthy();
    }
  });

  it("buildWorkingPhrase determinism check (engine sanity)", () => {
    const a = buildWorkingPhrase({ phase: "thinking", level: "off", rng: () => 0.3 });
    const b = buildWorkingPhrase({ phase: "thinking", level: "off", rng: () => 0.3 });
    expect(a).toBe(b);
    const level: ThinkingLevel = "off";
    expect(getPhrasePool("thinking", level)).toContain(a);
  });
});
