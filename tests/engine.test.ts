import { describe, it, expect } from "vitest";
import { execute, initialState, scenario } from "../src/lib/engine";

describe("guided simulation", () => {
  it("completes twelve steps and distinguishes denied and allowed requests", () => {
    let state = initialState();
    for (const [index, step] of scenario.steps.entries()) {
      const result = execute(state, step.command);
      expect(result.accepted).toBe(true);
      expect(result.state.step).toBe(index + 1);
      state = result.state;
    }
    expect(state.events).toHaveLength(12);
    expect(state.entries.some((e) => e.text.includes("Access Denied"))).toBe(
      true,
    );
    expect(
      state.entries.some((e) => e.text.includes("GetObject: ALLOWED")),
    ).toBe(true);
    expect(execute(state, "lab verify trusted-session").state.step).toBe(12);
  });
  it("rejects out-of-order commands and typos without changing progress", () => {
    const state = initialState();
    for (const command of [
      "whoami",
      "ssh root@legacy.invlid",
      "echo nope",
      scenario.steps[10].command,
    ]) {
      const result = execute(state, command);
      expect(result.accepted).toBe(false);
      expect(result.state.step).toBe(0);
      expect(result.state.events).toHaveLength(0);
    }
  });
  it("redacts both accepted and incorrect password input", () => {
    const state = execute(initialState(), scenario.steps[0].command).state;
    for (const password of ["Admin123!", "private-test-value"]) {
      const result = execute(state, password);
      expect(JSON.stringify(result.state)).not.toContain(password);
    }
  });
  it("supports help, pwd, clear and whitespace without advancing", () => {
    let state = initialState();
    for (const command of ["help", "pwd", "  "]) {
      state = execute(state, command).state;
      expect(state.step).toBe(0);
    }
    state = execute(state, "clear").state;
    expect(state.entries).toHaveLength(0);
    expect(
      execute(state, "  " + scenario.steps[0].command + "  ").accepted,
    ).toBe(true);
  });
  it("bounds history and rejects oversized input", () => {
    let state = initialState();
    for (let i = 0; i < 100; i++) state = execute(state, "help").state;
    expect(state.entries).toHaveLength(100);
    expect(execute(state, "x".repeat(257)).state).toBe(state);
  });
  it("keeps all stages consistent and all hosts reserved", () => {
    expect(scenario.steps.map((s) => s.stage)).toEqual([
      0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2,
    ]);
    expect(scenario.steps[0].command).toContain(".invalid");
  });
});
