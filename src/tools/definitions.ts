import { z } from "zod";
import * as handlers from "./handlers";
import { tool } from "@langchain/core/tools";
import { overArgs } from "lodash";

export const getActiveTabTool = tool(handlers.getActiveTab, {
  name: "getActiveTab",
  description:
    "Get information about the user's currently active tab in Beekeeper Studio",
});

export const updateQueryTextTool = tool(handlers.updateQueryText, {
  name: "updateQueryText",
  description: "Update the SQL query text in a specific tab",
  schema: z.object({
    tabId: z.number().describe("The ID of the tab containing the query to update"),
    query: z.string().describe("The new SQL query text"),
  }),
  tags: ["write"]
})

export const getConnectionInfoTool = tool(handlers.getConnectionInfo, {
  name: "getConnectionInfo",
  description:
    "Get information about the current database connection including type, default database, and read-only status",
});

export const getTablesTool = tool(handlers.getTables, {
  name: "getTables",
  description: "Get a list of all tables in the current database",
})

export const getTableColumnsTool = tool(handlers.getTableColumns, {
  name: "getTableColumns",
  description: "Get all columns for a specific table including name and data type",
  schema: z.object({
    table: z.string().describe("The name of the table to get columns for"),
  }),
})

export const tools = [
  getActiveTabTool,
  updateQueryTextTool,
  getConnectionInfoTool,
  getTablesTool,
  getTableColumnsTool,
];