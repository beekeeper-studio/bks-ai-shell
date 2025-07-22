import { z } from "zod";
import { tool, ToolSet, ToolResult } from "ai";
import {
  getColumns,
  getTables,
} from "@beekeeperstudio/plugin";
import { safeJSONStringify } from "@/utils";

export type MappedToolResult =
  | ToolResult<"get_tables", z.infer<typeof get_tables['parameters']>, string>
  | ToolResult<"get_columns", z.infer<typeof get_columns['parameters']>, string>
  | ToolResult<"run_query", z.infer<typeof run_query['parameters']>, string>;

export const get_tables = tool({
  description: "Get a list of all tables in the current database",
  parameters: z.object({
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
        message: e.message,
      });
    }
  },
});

export const get_columns = tool({
  description:
    "Get all columns for a specific table including name and data type",
  parameters: z.object({
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
        message: e.message,
      });
    }
  },
});

export type RunQueryParams = z.infer<typeof run_query['parameters']>;

export const run_query = tool({
  description: "Run a SQL query and get the results",
  parameters: z.object({
    query: z.string().describe("The SQL query to execute"),
  }),
  // No execute function because user permission is required
});

export const tools = {
  get_tables,
  get_columns,
  run_query,
}
