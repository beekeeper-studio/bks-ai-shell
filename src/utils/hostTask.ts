/**
 * Tasks handed to a new AI Shell tab by the host app.
 *
 * Beekeeper Studio opens the AI Shell pre-loaded with work from a couple of
 * places — "Debug with AI" on a failed query, and "Ask AI" in the query editor
 * toolbar. The host passes structured data only; composing the actual prompt is
 * our job, so phrasing (and any future localisation) stays in one place.
 *
 * The params arrive via `getViewContext()`. They are persisted with the tab and
 * re-delivered on every mount, so a task must only ever be carried out once —
 * see `taskConsumed` in the tab state store.
 */

export const HOST_TASK_COMMANDS = ["debug-query-error", "ask-question"] as const;

export type HostTaskCommand = (typeof HOST_TASK_COMMANDS)[number];

export type DebugQueryErrorParams = {
  /** The SQL that was executed. */
  query: string;
  error: {
    message: string;
    line?: number;
    ch?: number;
    /** Character offset into the query, where the dialect reports one. */
    position?: number;
  };
};

export type AskQuestionParams = {
  /** The SQL the question is about. */
  query: string;
  /** True when `query` is the user's selection rather than the whole editor. */
  isSelection: boolean;
  /** The user's question, verbatim. */
  question: string;
};

export type HostTask =
  | { command: "debug-query-error"; params: DebugQueryErrorParams }
  | { command: "ask-question"; params: AskQuestionParams };

export function isHostTaskCommand(
  command: unknown,
): command is HostTaskCommand {
  return (
    typeof command === "string" &&
    (HOST_TASK_COMMANDS as readonly string[]).includes(command)
  );
}

/**
 * Turn a view context into a task, or `null` if this tab wasn't opened with one
 * (or the host sent something we don't understand).
 */
export function parseHostTask(context: unknown): HostTask | null {
  if (!context || typeof context !== "object") return null;

  const { command, params } = context as { command?: unknown; params?: unknown };

  if (!isHostTaskCommand(command)) return null;
  if (!params || typeof params !== "object") return null;

  if (command === "debug-query-error") {
    const p = params as Partial<DebugQueryErrorParams>;
    if (typeof p.query !== "string" || typeof p.error?.message !== "string") {
      return null;
    }
    return { command, params: p as DebugQueryErrorParams };
  }

  const p = params as Partial<AskQuestionParams>;
  if (typeof p.query !== "string" || typeof p.question !== "string") {
    return null;
  }
  if (!p.question.trim()) return null;
  return {
    command,
    params: { ...p, isSelection: !!p.isSelection } as AskQuestionParams,
  };
}

function fence(query: string): string {
  return "```sql\n" + query.trim() + "\n```";
}

/** The prompt sent on the user's behalf. */
export function composeHostTaskPrompt(task: HostTask): string {
  if (task.command === "debug-query-error") {
    const { query, error } = task.params;

    const location: string[] = [];
    if (typeof error.line === "number") {
      location.push(`line ${error.line}`);
    }
    if (typeof error.ch === "number") {
      location.push(`character ${error.ch}`);
    }
    if (!location.length && typeof error.position === "number") {
      location.push(`position ${error.position}`);
    }

    const where = location.length ? ` (at ${location.join(", ")})` : "";

    return [
      "This query failed. Work out why and give me a corrected version.",
      "",
      fence(query),
      "",
      `The database returned${where}:`,
      "",
      "```",
      error.message.trim(),
      "```",
    ].join("\n");
  }

  const { query, question, isSelection } = task.params;
  const subject = isSelection
    ? "Here is the query I have selected in the editor:"
    : "Here is the query I have open in the editor:";

  return [subject, "", fence(query), "", question.trim()].join("\n");
}
