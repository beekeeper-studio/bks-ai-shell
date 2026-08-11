import { describe, expect, it } from "vitest";
import {
  composeHostTaskPrompt,
  isHostTaskCommand,
  parseHostTask,
} from "@/utils/hostTask";

describe("isHostTaskCommand", () => {
  it("recognises the commands the host sends", () => {
    expect(isHostTaskCommand("debug-query-error")).toBe(true);
    expect(isHostTaskCommand("ask-question")).toBe(true);
  });

  it("ignores anything else", () => {
    expect(isHostTaskCommand("new-tab-dropdown-item")).toBe(false);
    expect(isHostTaskCommand(undefined)).toBe(false);
    expect(isHostTaskCommand(42)).toBe(false);
  });
});

describe("parseHostTask", () => {
  it("returns null for a tab opened without a task", () => {
    expect(parseHostTask({ command: "new-tab-dropdown-item" })).toBeNull();
    expect(parseHostTask(undefined)).toBeNull();
    expect(parseHostTask(null)).toBeNull();
  });

  it("parses a debug task", () => {
    const task = parseHostTask({
      command: "debug-query-error",
      params: {
        query: "SELEKT 1",
        error: { message: 'near "SELEKT": syntax error', line: 1, ch: 6 },
      },
    });

    expect(task).toEqual({
      command: "debug-query-error",
      params: {
        query: "SELEKT 1",
        error: { message: 'near "SELEKT": syntax error', line: 1, ch: 6 },
      },
    });
  });

  it("parses an ask task and defaults isSelection", () => {
    const task = parseHostTask({
      command: "ask-question",
      params: { query: "SELECT 1", question: "what does this do?" },
    });

    expect(task).toEqual({
      command: "ask-question",
      params: {
        query: "SELECT 1",
        question: "what does this do?",
        isSelection: false,
      },
    });
  });

  it("rejects malformed params rather than sending a half-built prompt", () => {
    expect(
      parseHostTask({ command: "debug-query-error", params: { query: "x" } }),
    ).toBeNull();
    expect(
      parseHostTask({ command: "ask-question", params: { query: "x" } }),
    ).toBeNull();
    expect(
      parseHostTask({
        command: "ask-question",
        params: { query: "x", question: "   " },
      }),
    ).toBeNull();
  });
});

describe("composeHostTaskPrompt", () => {
  it("includes the query and the error, with its location", () => {
    const prompt = composeHostTaskPrompt({
      command: "debug-query-error",
      params: {
        query: "SELEKT * FROM users",
        error: { message: 'near "SELEKT": syntax error', line: 1, ch: 6 },
      },
    });

    expect(prompt).toContain("SELEKT * FROM users");
    expect(prompt).toContain('near "SELEKT": syntax error');
    expect(prompt).toContain("line 1");
    expect(prompt).toContain("character 6");
  });

  it("falls back to position when there is no line/ch", () => {
    const prompt = composeHostTaskPrompt({
      command: "debug-query-error",
      params: {
        query: "SELEKT 1",
        error: { message: "syntax error", position: 3 },
      },
    });

    expect(prompt).toContain("position 3");
  });

  it("omits the location entirely when the dialect gives none", () => {
    const prompt = composeHostTaskPrompt({
      command: "debug-query-error",
      params: { query: "SELEKT 1", error: { message: "syntax error" } },
    });

    expect(prompt).not.toContain("at ");
    expect(prompt).toContain("syntax error");
  });

  it("says whether the query is a selection", () => {
    const selected = composeHostTaskPrompt({
      command: "ask-question",
      params: { query: "SELECT 1", question: "why?", isSelection: true },
    });
    const whole = composeHostTaskPrompt({
      command: "ask-question",
      params: { query: "SELECT 1", question: "why?", isSelection: false },
    });

    expect(selected).toContain("selected in the editor");
    expect(whole).toContain("open in the editor");
    expect(selected).toContain("why?");
  });
});
