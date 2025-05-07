/**
 * Database service for interacting with the Beekeeper Studio plugin system
 */

import { query as commsQuery } from '../Comms';
import { IActiveTab, IConnectionInfo, ITableColumn } from '../types';
import { formatApiError } from '../utils/errorHandler';

/**
 * Generic query function that forwards requests to the plugin system
 */
export async function query<T>(name: string, args?: any): Promise<T> {
  try {
    return await commsQuery(name, args);
  } catch (error) {
    console.error(`Database query error (${name}):`, error);
    throw error;
  }
}

/**
 * Get information about the active tab
 */
export async function getActiveTab(): Promise<IActiveTab> {
  try {
    return await query<IActiveTab>("getActiveTab");
  } catch (error) {
    console.error("Error fetching active tab:", error);
    throw error;
  }
}

/**
 * Get database connection information
 */
export async function getConnectionInfo(): Promise<IConnectionInfo> {
  try {
    return await query<IConnectionInfo>("getConnectionInfo");
  } catch (error) {
    console.error("Error fetching connection info:", error);
    throw error;
  }
}

/**
 * Get a list of all tables in the database
 */
export async function getTables(): Promise<string[]> {
  try {
    return await query<string[]>("getTables");
  } catch (error) {
    console.error("Error fetching tables:", error);
    throw error;
  }
}

/**
 * Get columns for a specific table
 */
export async function getTableColumns(table: string): Promise<ITableColumn[]> {
  try {
    return await query<ITableColumn[]>("getColumns", { table });
  } catch (error) {
    console.error(`Error fetching columns for table ${table}:`, error);
    throw error;
  }
}
