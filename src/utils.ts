import { UIMessage } from "ai";
import { Model } from "./stores/chat";
import _ from "lodash";
import { identify } from "sql-query-identifier";

/** It's safe cause we hope it doesn't throw any errors, hopefully. */
export function safeJSONStringify(value: any, ...args: any): string {
  return JSON.stringify(
    value,
    (_key, val) => (typeof val === "bigint" ? val.toString() : val),
    args[1],
  );
}

export function buildErrorContent(error: Error): string {
  return JSON.stringify({
    type: "error",
    message: error.message,
    stack: error.stack,
    cause: error.cause,
  });
}

export function parseErrorContent(content: string) {
  const obj = JSON.parse(content);
  const err = new Error(obj.message, { cause: obj.cause });
  err.stack = obj.stack;
  return err;
}

export function isErrorContent(str: unknown): str is string {
  try {
    return JSON.parse(str)?.type === "error";
  } catch (e) {
    return false;
  }
}

export function tryJSONParse(str: string) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return str;
  }
}

export function isAbortError(error: unknown) {
  return (
    error instanceof Error &&
    (error.message.startsWith("Aborted") ||
      error.message.startsWith("AbortError"))
  );
}

export function parseHeaders(text: string): Record<string, string> {
  const headers = {};
  const lines = text.split("\n");

  for (let line of lines) {
    line = line.trim();
    if (!line || !line.includes(":")) continue;

    const [key, ...rest] = line.split(":");
    const trimmedKey = key.trim();
    const value = rest.join(":").trim();

    if (trimmedKey) {
      headers[trimmedKey] = value;
    }
  }

  return headers;
}

/* Compare two models */
export function matchModel(a: Model, b?: Model) {
  return a.id === b?.id && a.provider === b?.provider;
}

export function isReadQuery(query: string) {
  try {
    // Not sure, but assume that identify() can throw an error
    return identify(query).every(
      ({ executionType }) =>
        executionType === "LISTING" || executionType === "INFORMATION",
    );
  } catch (e) {
    return false;
  }
}

export function isEmptyUIMessage(message: UIMessage): boolean {
  const nonEmptyParts = message.parts.filter((part) => {
    if (part.type === "step-start") {
      return false;
    }

    if ((part.type === "text" || part.type === "reasoning") && _.isEmpty(part.text)) {
      return false;
    }

    return true;
  });

  return nonEmptyParts.length === 0;
}
