import { z } from "zod/v3";
import { tool } from "ai";
import { getColumns, getTables } from "@beekeeperstudio/plugin";
import { safeJSONStringify } from "@/utils";

export const get_tables = tool({
  description: "Get a list of all tables in the current database",
  inputSchema: z.object({
    schema: z
      .string()
      .nullish()
      .describe("The name of the schema to get tables for"),
  }),
  execute: async (params) => {
    try {
      return safeJSONStringify(await getTables(params.schema ?? undefined));
    } catch (e) {
      return safeJSONStringify({
        type: "error",
        message: e?.message || e.toString() || "Unknown error",
      });
    }
  },
});

export const get_columns = tool({
  description:
    "Get all columns for a specific table including name and data type",
  inputSchema: z.object({
    table: z.string().describe("The name of the table to get columns for"),
    schema: z
      .string()
      .nullish()
      .describe("The name of the schema of the table"),
  }),
  execute: async (params) => {
    try {
      return safeJSONStringify(
        await getColumns(params.table, params.schema ?? undefined),
      );
    } catch (e) {
      return safeJSONStringify({
        type: "error",
        message: e?.message || e.toString() || "Unknown error",
      });
    }
  },
});

export const run_query = tool({
  description: "Run a SQL query and get the results",
  inputSchema: z.object({
    query: z.string().describe("The SQL query to execute"),
  }),
});

export const tools = {
  get_tables,
  get_columns,
  run_query,
};

export class UserRejectedError extends Error {
  constructor(public toolCallId: string) {
    super();
    this.name = "UserRejectedError";
  }

  static isInstance(error: any): error is UserRejectedError {
    return error && error.name === "UserRejectedError";
  }
}

export const userRejectedToolCall = "User rejected tool call";
