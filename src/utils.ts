export function safeJSONStringify(value: any, ...args: any): string {
  return JSON.stringify(
    value,
    (_key, val) => (typeof val === "bigint" ? `${val}n` : val),
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

export function isErrorContent(str: string) {
  try {
    return JSON.parse(str)?.type === "error";
  } catch (e) {
    return false;
  }
}
