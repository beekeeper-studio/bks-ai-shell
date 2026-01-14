import { z } from "zod/v3";
import { tool } from "ai";
import { getColumns, getTables, runQuery } from "@beekeeperstudio/plugin";
import { isReadQuery, safeJSONStringify } from "@/utils";
import { useConfigurationStore } from "@/stores/configuration";

export const get_tables = tool({
  description: "Get a list of all tables in the current database",
  inputSchema: z.object({
    schema: z
      .string()
      .nullish()
      .describe("The name of the schema to get tables for"),
  }),
  needsApproval: false,
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
  needsApproval: false,
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
  needsApproval({ query }) {
    if (
      useConfigurationStore().allowExecutionOfReadOnlyQueries &&
      isReadQuery(query)
    ) {
      return false;
    }
    return true;
  },
  execute: async (params) => {
    try {
      return safeJSONStringify(await runQuery(params.query));
    } catch (e) {
      return safeJSONStringify({
        type: "error",
        message: e?.message || e.toString() || "Unknown error",
      });
    }
  },
});

export const tools = {
  get_tables,
  get_columns,
  run_query,
};
