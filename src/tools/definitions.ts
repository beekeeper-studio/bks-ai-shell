import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { getColumns, getConnectionInfo, getTables, runQuery } from "@beekeeperstudio/plugin";
import { safeJSONStringify } from "../utils";

const getTablesInputSchema = z.object({
  schema: z
    .string()
    .optional()
    .describe("The name of the schema to get tables for"),
});

const getColumnsInputSchema = z.object({
  table: z.string().describe("The name of the table to get columns for"),
  schema: z.string().optional().describe("The name of the schema of the table"),
});

const runQueryInputSchema = z.object({
  query: z.string().describe("The SQL query to execute"),
});

export const getConnectionInfoTool = tool(
  async () => {
    const result = await getConnectionInfo();
    return safeJSONStringify(result);
  },
  {
    name: "get_connection_info",
    description:
      "Get information about the current database connection including type, default database, and read-only status",
  },
);

export const getTablesTool = tool(
  async (params) => {
    const result = await getTables(params.schema);
    return safeJSONStringify(result);
  },
  {
    name: "get_tables",
    description: "Get a list of all tables in the current database",
    schema: getTablesInputSchema,
  },
);

export const getColumnsTool = tool(
  async (params) => {
    const result = await getColumns(params.table, params.schema);
    return safeJSONStringify(result);
  },
  {
    name: "get_columns",
    description:
      "Get all columns for a specific table including name and data type",
    schema: getColumnsInputSchema,
  },
);

export const runQueryTool = tool(
  async (params) => {
    const result = await runQuery(params.query);
    return safeJSONStringify(result);
  },
  {
    name: "run_query",
    description: "Run a SQL query and get the results",
    schema: runQueryInputSchema,
    tags: ["write"],
  },
);

export const tools = [
  getConnectionInfoTool,
  getTablesTool,
  getColumnsTool,
  runQueryTool,
];
