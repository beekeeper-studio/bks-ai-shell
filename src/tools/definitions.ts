import { z } from "zod";
import { DynamicTool, tool } from "@langchain/core/tools";
import { request } from "../vendor/@beekeeperstudio/plugin/comms";
import { safeJSONStringify } from "../utils";

export const getActiveTabTool = new DynamicTool({
  name: "getActiveTab",
  description:
    "Get information about the user's currently active tab in Beekeeper Studio",
  func: async () => {
    const result = await request("getActiveTab");
    return safeJSONStringify(result);
  },
});

export const getConnectionInfoTool = new DynamicTool({
  name: "getConnectionInfo",
  description:
    "Get information about the current database connection including type, default database, and read-only status",
  func: async () => {
    const result = await request("getConnectionInfo");
    return safeJSONStringify(result);
  },
});

export const getTablesTool = tool(
  async (params: { schema?: string }) => {
    const result = await request("getTables", { schema: params.schema });
    return safeJSONStringify(result);
  },
  {
    name: "getTables",
    description: "Get a list of all tables in the current database",
    schema: z.object({
      schema: z
        .string()
        .optional()
        .describe("The name of the schema to get tables for"),
    }),
  },
);

export const getTableColumnsTool = tool(
  async (params: { table: string }) => {
    const result = await request("getColumns", { table: params.table });
    return safeJSONStringify(result);
  },
  {
    name: "getTableColumns",
    description:
      "Get all columns for a specific table including name and data type",
    schema: z.object({
      table: z.string().describe("The name of the table to get columns for"),
    }),
  },
);

export const getAllTabsTool = new DynamicTool({
  name: "getAllTabs",
  description: "Get a list of all open query tabs in Beekeeper Studio",
  func: async () => {
    const result = await request("getAllTabs");
    return safeJSONStringify(result);
  },
});

export const createQueryTabTool = tool(
  async (params: { query: string; title: string }) => {
    const result = await request("createQueryTab", {
      query: params.query,
      title: params.title,
    });
    return safeJSONStringify(result);
  },
  {
    name: "createQueryTab",
    description: "Create a new query tab with specified content",
    schema: z.object({
      query: z.string().describe("The SQL query text for the new tab"),
      title: z.string().describe("The title for the new tab"),
    }),
    tags: ["write"],
  },
);

export const updateQueryTextTool = tool(
  async (params: { tabId: number; query: string }) => {
    await request("updateQueryText", {
      tabId: params.tabId,
      query: params.query,
    });
    return safeJSONStringify({
      success: true,
      message: "Query text updated successfully",
      tabId: params.tabId,
    });
  },
  {
    name: "updateQueryText",
    description: "Update the SQL query text in a specific tab",
    schema: z.object({
      tabId: z
        .number()
        .describe("The ID of the tab containing the query to update"),
      query: z.string().describe("The new SQL query text"),
    }),
    tags: ["write"],
  },
);

export const runQueryTool = tool(
  async (params: { query: string }) => {
    const result = await request("runQuery", { query: params.query });
    return safeJSONStringify(result);
  },
  {
    name: "runQuery",
    description: "Run a SQL query and get the results",
    schema: z.object({
      query: z.string().describe("The SQL query to execute"),
    }),
    tags: ["write"],
  },
);

export const runQueryTabTool = tool(
  async (params: { tabId: number }) => {
    const result = await request("runQueryTab", { tabId: params.tabId });
    return safeJSONStringify(result);
  },
  {
    name: "runQueryTab",
    description: "Run the query in a specific tab",
    schema: z.object({
      tabId: z
        .number()
        .describe("The ID of the tab containing the query to run"),
    }),
    tags: ["write"],
  },
);

// export const runQueryTabPartiallyTool = new DynamicStructuredTool({
//   name: "runQueryTabPartially",
//   description: "Run a portion of the query in a specific tab",
//   func: handlers.runQueryTabPartially,
//   schema: z.object({
//     tabId: z.number().describe("The ID of the tab containing the query"),
//     from: z.number().describe("The starting line number (1-based)"),
//     to: z.number().describe("The ending line number (1-based)"),
//   }),
//   tags: ["write"]
// });

// export const insertSuggestionTool = new DynamicStructuredTool({
//   name: "insertSuggestion",
//   description: "Insert a suggestion into a specific range in a query tab",
//   func: handlers.insertSuggestion,
//   schema: z.object({
//     tabId: z.number().describe("The ID of the tab to insert the suggestion into"),
//     suggestion: z.string().describe("The text to insert"),
//     from: z.number().describe("The starting line number (1-based)"),
//     to: z.number().describe("The ending line number (1-based)"),
//   }),
//   tags: ["write"]
// });

export const tools = [
  getActiveTabTool,
  getConnectionInfoTool,
  getTablesTool,
  getTableColumnsTool,
  getAllTabsTool,
  createQueryTabTool,
  updateQueryTextTool,
  runQueryTool,
  runQueryTabTool,
  // TODO: These are not supported by Beekeeper Studio yet
  // runQueryTabPartiallyTool,
  // insertSuggestionTool,
];
