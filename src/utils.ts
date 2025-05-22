export function safeJSONStringify(value: any): string {
  return JSON.stringify(value, (_key, val) =>
    typeof val === "bigint" ? `${val}n` : val,
  );
}
