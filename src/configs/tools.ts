/**
 * Tool configuration definitions
 */

export const TOOLS = {
  getActiveTab: {
    name: "getActiveTab",
    description:
      "Get information about the user's currently active tab in Beekeeper Studio",
    schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },

  analyzeSql: {
    name: "analyzeSql",
    description:
      "Analyze SQL query for correctness, performance issues, and suggestions",
    schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The SQL query to analyze",
        },
      },
      required: ["query"],
    },
  },

  updateQueryText: {
    name: "updateQueryText",
    description: "Update the SQL query text in a specific tab",
    schema: {
      type: "object",
      properties: {
        tabId: {
          type: "number",
          description: "The ID of the tab containing the query to update",
        },
        query: {
          type: "string",
          description: "The new SQL query text",
        },
      },
      required: ["tabId", "query"],
    },
  },

  getConnectionInfo: {
    name: "getConnectionInfo",
    description:
      "Get information about the current database connection including type, default database, and read-only status",
    schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },

  getTables: {
    name: "getTables",
    description: "Get a list of all tables in the current database",
    schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },

  getTableColumns: {
    name: "getTableColumns",
    description:
      "Get all columns for a specific table including name and data type",
    schema: {
      type: "object",
      properties: {
        table: {
          type: "string",
          description: "The name of the table to get columns for",
        },
      },
      required: ["table"],
    },
  },
};
