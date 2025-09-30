import { z } from "zod";
import { tool, ToolSet } from "ai";
import {
  getColumns,
  getTables,
  runQuery,
} from "@beekeeperstudio/plugin";
import { safeJSONStringify } from "@/utils";

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

export const run_query = (
  onAskPermission: (toolCallId: string, params: any) => Promise<void>,
) =>
  tool({
    description: "Run a SQL query and get the results",
    parameters: z.object({
      query: z.string().describe("The SQL query to execute"),
    }),
    execute: async (params, options) => {
      await onAskPermission(options.toolCallId, params);
      try {
        return safeJSONStringify(
          await runQuery(params.query),
        );
      } catch (e) {
        return safeJSONStringify({
          type: "error",
          message: e.message,
        });
      }
    },
  });

export function getTools(
  onAskPermission: (name: string, toolCallId: string, params: unknown) => Promise<boolean>,
): ToolSet {
  const toolSet: ToolSet = {
    get_tables,
    get_columns,
  };
  toolSet["run_query"] = run_query(async (toolCallId, params) => {
    const permitted = await onAskPermission("run_query", toolCallId, params);
    if (!permitted) {
      throw new UserRejectedError(toolCallId);
    }
  });
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
