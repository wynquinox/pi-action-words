import { describe, expect, it } from "vitest";

import { WorkingPhaseTracker } from "../src/tracker.js";

describe("WorkingPhaseTracker", () => {
  it("starts idle: thinking phase, no tool name", () => {
    const tracker = new WorkingPhaseTracker();
    expect(tracker.currentPhase()).toBe("thinking");
    expect(tracker.currentToolName()).toBeUndefined();
    expect(tracker.inFlightCount).toBe(0);
  });

  it("tracks a single tool lifecycle", () => {
    const tracker = new WorkingPhaseTracker();
    tracker.toolStarted("t1", "bash");
    expect(tracker.currentPhase()).toBe("bash");
    expect(tracker.currentToolName()).toBe("bash");
    expect(tracker.inFlightCount).toBe(1);

    const phase = tracker.toolEnded("t1");
    expect(phase).toBe("thinking");
    expect(tracker.currentPhase()).toBe("thinking");
    expect(tracker.currentToolName()).toBeUndefined();
    expect(tracker.inFlightCount).toBe(0);
  });

  it("keeps the phase of the remaining tool when one of two parallel tools ends", () => {
    const tracker = new WorkingPhaseTracker();
    tracker.toolStarted("t1", "bash");
    tracker.toolStarted("t2", "read");
    expect(tracker.currentPhase()).toBe("read"); // most recently started wins

    expect(tracker.toolEnded("t1")).toBe("read"); // bash done, read still running
    expect(tracker.currentToolName()).toBe("read");

    expect(tracker.toolEnded("t2")).toBe("thinking");
  });

  it("reports the phase of the last-started still-in-flight tool", () => {
    const tracker = new WorkingPhaseTracker();
    tracker.toolStarted("t1", "grep");
    tracker.toolStarted("t2", "write");
    tracker.toolStarted("t3", "bash");
    expect(tracker.currentPhase()).toBe("bash");

    tracker.toolEnded("t3");
    expect(tracker.currentPhase()).toBe("write");

    tracker.toolEnded("t2");
    expect(tracker.currentPhase()).toBe("search"); // grep -> search
  });

  it("maps unknown tools to the 'other' phase and exposes the tool name", () => {
    const tracker = new WorkingPhaseTracker();
    tracker.toolStarted("t1", "my_custom_tool");
    expect(tracker.currentPhase()).toBe("other");
    expect(tracker.currentToolName()).toBe("my_custom_tool");
  });

  it("ignores end events for unknown tool call ids", () => {
    const tracker = new WorkingPhaseTracker();
    tracker.toolStarted("t1", "read");
    const phase = tracker.toolEnded("never-started");
    expect(phase).toBe("read");
    expect(tracker.inFlightCount).toBe(1);
  });

  it("resets all state", () => {
    const tracker = new WorkingPhaseTracker();
    tracker.toolStarted("t1", "bash");
    tracker.toolStarted("t2", "edit");
    tracker.reset();
    expect(tracker.currentPhase()).toBe("thinking");
    expect(tracker.currentToolName()).toBeUndefined();
    expect(tracker.inFlightCount).toBe(0);
  });
});
