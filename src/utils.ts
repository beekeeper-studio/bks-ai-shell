export function safeJSONStringify(value: any, ...args: any): string {
  return JSON.stringify(value, (_key, val) =>
    typeof val === "bigint" ? `${val}n` : val,
    args[1]
  );
}
