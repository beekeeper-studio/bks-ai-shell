/**
 * Tools for AI models to access data and functionality
 */

import { tool } from "@langchain/core/tools";
import { query } from '../services/databaseService';
import { IActiveTab } from '../types';
import { TOOLS } from '../configs';

// Interface for updateQueryText parameters
interface UpdateQueryParams {
  tabId: number;
  query: string;
}

/**
 * Tool for getting information about the currently active tab
 * 
 * Allows Claude to request information about what the user is 
 * currently viewing in Beekeeper Studio
 */
export const getActiveTabTool = tool(
  async () => {
    try {
      const result = await query<IActiveTab>("getActiveTab");
      return JSON.stringify(result);
    } catch (error) {
      console.error("Error fetching active tab:", error);
      return JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to get active tab" 
      });
    }
  },
  {
    name: TOOLS.getActiveTab.name,
    description: TOOLS.getActiveTab.description,
    schema: TOOLS.getActiveTab.schema
  }
);

/**
 * Tool for updating the SQL query text in a specific tab
 * 
 * Allows Claude to modify the content of SQL query editors
 */
export const updateQueryTextTool = tool(
  async (input: UpdateQueryParams) => {
    try {
      if (!input || typeof input.tabId !== 'number' || typeof input.query !== 'string') {
        throw new Error("Missing or invalid parameters: requires tabId (number) and query (string)");
      }
      // Call the query function to update the SQL text
      const result = await query("updateQueryText", { tabId: input.tabId, query: input.query });
      return JSON.stringify({
        success: true,
        message: "Query text updated successfully",
        tabId: input.tabId
      });
    } catch (error) {
      console.error("Error updating query text:", error);
      return JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Failed to update query text",
        tabId: input?.tabId
      });
    }
  },
  {
    name: TOOLS.updateQueryText.name,
    description: TOOLS.updateQueryText.description,
    schema: TOOLS.updateQueryText.schema
  }
);
