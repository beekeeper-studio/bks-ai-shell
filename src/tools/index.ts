import { z } from "zod";
import { Tool, tool, ToolSet } from "ai";
import {
  getColumns,
  getConnectionInfo,
  getTables,
  runQuery,
} from "@beekeeperstudio/plugin";
import { safeJSONStringify } from "@/utils";

export const get_connection_info = tool({
  description:
    "Get information about the current database connection including type, default database, and read-only status",
  parameters: z.object({}),
  execute: async () => {
    return safeJSONStringify(await getConnectionInfo());
  },
});

export const get_tables = tool({
  description: "Get a list of all tables in the current database",
  parameters: z.object({
    schema: z
      .string()
      .nullish()
      .describe("The name of the schema to get tables for"),
  }),
  execute: async (params) => {
    return safeJSONStringify(await getTables(params.schema ?? undefined));
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
    return safeJSONStringify(
      await getColumns(params.table, params.schema ?? undefined),
    );
  },
});

export const run_query = (onAskPermission: (toolCallId: string, params: any) => Promise<void>) =>
  tool({
    description: "Run a SQL query and get the results",
    parameters: z.object({
      query: z.string().describe("The SQL query to execute"),
    }),
    execute: async (params, options) => {
      await onAskPermission(options.toolCallId, params);
      return safeJSONStringify(await runQuery(params.query));
    },
  });

export function getTools(
  onAskPermission: (name: string, params: any) => Promise<boolean>,
): ToolSet {
  const toolSet: ToolSet = {
    get_connection_info,
    get_tables,
    get_columns,
  };
  toolSet["run_query"] = run_query(
    async (toolCallId, params) => {
      const permitted = await onAskPermission("run_query", params)
      if (!permitted) {
        throw new UserRejectedError(toolCallId);
      }
    },
  );
  return toolSet;
}

export class UserRejectedError extends Error {
  constructor(public toolCallId: string) {
    super();
    this.name = "UserRejectedError";
  }

  static isInstance(error: any): error is UserRejectedError {
    return error && error.name === "UserRejectedError";
  }
}
