import { request } from "../Comms";

export async function getConnectionInfo() {
  try {
    const result = await request("getConnectionInfo");
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
}

export async function getTables() {
  try {
    const result = await request("getTables");
    return JSON.stringify(result);
  } catch (error) {
    console.error("Error fetching tables:", error);
    return JSON.stringify({
      error: error instanceof Error ? error.message : "Failed to get tables",
    });
  }
}

export async function getTableColumns(params: { table: string }) {
  try {
    if (!params || !params.table) {
      throw new Error("Table name is required");
    }
    const result = await request("getColumns", { table: params.table });
    return JSON.stringify(result);
  } catch (error) {
    console.error(`Error fetching columns for table ${params?.table}:`, error);
    return JSON.stringify({
      error:
        error instanceof Error ? error.message : "Failed to get table columns",
    });
  }
}

export async function getActiveTab() {
  try {
    const result = await request("getActiveTab");
    return JSON.stringify(result);
  } catch (error) {
    console.error("Error fetching active tab:", error);
    return JSON.stringify({
      error:
        error instanceof Error ? error.message : "Failed to get active tab",
    });
  }
}

export async function updateQueryText(params: {
  tabId: number;
  query: string;
}) {
  try {
    if (
      !params ||
      typeof params.tabId !== "number" ||
      typeof params.query !== "string"
    ) {
      throw new Error(
        "Missing or invalid parameters: requires tabId (number) and query (string)",
      );
    }
    // Call the query function to update the SQL text
    const result = await request("updateQueryText", {
      tabId: params.tabId,
      query: params.query,
    });
    return JSON.stringify({
      success: true,
      message: "Query text updated successfully",
      tabId: params.tabId,
    });
  } catch (error) {
    console.error("Error updating query text:", error);
    return JSON.stringify({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update query text",
      tabId: params?.tabId,
    });
  }
}

