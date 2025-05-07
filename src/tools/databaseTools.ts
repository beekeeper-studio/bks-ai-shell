/**
 * Database-related tools for accessing schema and query information
 */

import { tool } from "@langchain/core/tools";
import { query } from "../services/databaseService";
import { IActiveTab, IConnectionInfo, ITableColumn } from "../types";
import { TOOLS } from "../config";

/**
 * Get information about the user's currently active tab
 */
export const getActiveTabTool = tool(async () => {
  try {
    const result = await query("getActiveTab");
    return JSON.stringify(result);
  } catch (error) {
    console.error("Error fetching active tab:", error);
    return JSON.stringify({
      error:
        error instanceof Error ? error.message : "Failed to get active tab",
    });
  }
}, TOOLS.getActiveTab);

/**
 * Tool for getting database connection information
 */
export const getConnectionInfoTool = tool(async () => {
  try {
    const result = await query("getConnectionInfo");
    return JSON.stringify(result);
  } catch (error) {
    console.error("Error fetching connection info:", error);
    return JSON.stringify({
      error:
        error instanceof Error
          ? error.message
          : "Failed to get connection information",
    });
  }
}, TOOLS.getConnectionInfo);

/**
 * Tool for getting a list of all tables in the database
 */
export const getTablesTool = tool(async () => {
  try {
    const result = await query("getTables");
    return JSON.stringify(result);
  } catch (error) {
    console.error("Error fetching tables:", error);
    return JSON.stringify({
      error: error instanceof Error ? error.message : "Failed to get tables",
    });
  }
}, TOOLS.getTables);

/**
 * Tool for getting columns for a specific table
 */
export const getTableColumnsTool = tool(async (input: { table: string }) => {
  try {
    console.log("momo", input);
    if (!input || !input.table) {
      throw new Error("Table name is required");
    }
    const result = await query("getColumns", { table: input.table });
    return JSON.stringify(result);
  } catch (error) {
    console.error(`Error fetching columns for table ${input?.table}:`, error);
    return JSON.stringify({
      error:
        error instanceof Error ? error.message : "Failed to get table columns",
    });
  }
}, TOOLS.getTableColumns);

/**
 * Standard function versions for internal use
 */

/**
 * Get database connection information
 */
export async function getConnectionInfo(): Promise<IConnectionInfo> {
  return await query("getConnectionInfo");
}

/**
 * Get a list of all tables in the database
 */
export async function getTables(): Promise<string[]> {
  return await query("getTables");
}

/**
 * Get columns for a specific table
 */
export async function getTableColumns(
  table: string,
): Promise<ITableColumn[]> {
  return await query("getColumns", { table: table });
}

/**
 * Generate database schema information in a formatted string
 */
export async function generateDatabaseSchemaInfo(): Promise<string> {
  try {
    // Get connection information
    const connectionInfo = await getConnectionInfo();
    let databaseInfo = "Database Connection Information:";

    if (connectionInfo) {
      databaseInfo += `\n- Connection Type: ${connectionInfo.connectionType || "Unknown"}`;
      databaseInfo += `\n- Default Database: ${connectionInfo.defaultDatabase || "None"}`;
      databaseInfo += `\n- Read-Only Mode: ${connectionInfo.readOnlyMode ? "Yes" : "No"}`;
    }

    // Get tables and their columns
    const tables = await getTables();
    let schemaInfo = "\n\nDatabase Schema Information:\n\nTables:";

    if (tables && Array.isArray(tables)) {
      for (const table of tables) {
        schemaInfo += `\n- ${table}`;

        // Get columns for each table
        try {
          const columns = await getTableColumns(table);
          if (columns && Array.isArray(columns)) {
            schemaInfo += "\n  Columns:";
            for (const column of columns) {
              schemaInfo += `\n  - ${column.name} (${column.type})`;
            }
          }
        } catch (columnError) {
          console.error(
            `Error fetching columns for table ${table}:`,
            columnError,
          );
        }
      }
    }

    return `${databaseInfo}${schemaInfo}`;
  } catch (error) {
    console.error("Error generating database schema info:", error);
    return "Unable to retrieve database schema information.";
  }
}
