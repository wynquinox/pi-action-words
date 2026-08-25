import { expect, vi } from "vitest";

// Only `buildWorkingPhrase` is consumed by src/index.ts (and by this file),
// so the mock module only needs to provide that one export.
vi.mock("../src/phrases.js", () => ({
  buildWorkingPhrase: vi.fn(),
}));

export const ELLIPSIS = "…";

export type MessageFn = ReturnType<typeof vi.fn<(message?: string) => void>>;
export type IndicatorFn = ReturnType<typeof vi.fn<(options?: unknown) => void>>;
export type StatusFn = ReturnType<typeof vi.fn<(key: string, text?: string) => void>>;
export type NotifyFn = ReturnType<
  typeof vi.fn<(message: string, type?: "info" | "warning" | "error") => void>
>;

export interface FakeUi {
  setWorkingMessage: MessageFn;
  setWorkingIndicator: IndicatorFn;
  setStatus: StatusFn;
  notify: NotifyFn;
  theme: { fg: (color: string, text: string) => string };
}

export interface FakeCtx {
  ui: FakeUi;
  thinkingLevel: string;
}

export type Handler = (event: unknown, ctx: unknown) => unknown;
export interface CommandDef {
  description?: string;
  handler: (args: string, ctx: unknown) => unknown;
}

export interface FakePi {
  pi: unknown;
  handlers: Map<string, Handler[]>;
  commands: Map<string, CommandDef>;
  ctx: FakeCtx;
}

export function createFakePi(thinkingLevel = "high"): FakePi {
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

export function fire(fake: FakePi, event: string, payload: Record<string, unknown>): void {
  const list = fake.handlers.get(event);
  expect(list, `handler for ${event}`).toBeTruthy();
  for (const handler of list ?? []) {
    handler(payload, fake.ctx);
  }
}

/** Last message argument passed to setWorkingMessage (undefined for reset/no call). */
export function lastMessage(ui: FakeUi): string | undefined {
  const calls = ui.setWorkingMessage.mock.calls;
  if (calls.length === 0) {
    return undefined;
  }
  const last = calls[calls.length - 1] as (string | undefined)[];
  return last.length > 0 ? last[0] : undefined;
}

export function phrasePart(message: string | undefined): string | undefined {
  if (message === undefined) {
    return undefined;
  }
  expect(message.endsWith(ELLIPSIS)).toBe(true);
  return message.slice(0, -ELLIPSIS.length);
}

export function poolContains(pool: readonly string[], phrase: string | undefined): void {
  expect(phrase).toBeTruthy();
  expect(pool).toContain(phrase!);
}

export function commandHandler(fake: FakePi): (args: string, ctx: FakeCtx) => unknown {
  const handler = fake.commands.get("action-words")?.handler;
  expect(handler).toBeTruthy();
  return handler!;
}
