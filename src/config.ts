import instructions from "../instructions.txt?raw";
import mongodbInstructions from "../mongodb-instructions.txt?raw";
import { getConnectionInfo, getTables } from "@beekeeperstudio/plugin";

export async function getDefaultInstructions() {
  const response = await getConnectionInfo();
  const tables = await getTables().then((tables) =>
    tables.filter(
      (table) =>
        table.schema !== "information_schema" &&
        table.schema !== "pg_catalog" &&
        table.schema !== "pg_toast" &&
        table.schema !== "sys" &&
        table.schema !== "INFORMATION_SCHEMA",
    ),
  );
  let result = instructions;
  result = result.replace("{connection_type}", response.connectionType);
  result = result.replace("{read_only_mode}", response.readOnlyMode.toString());
  result = result.replace("{database_name}", response.databaseName);
  result = result.replace("{default_schema}", response.defaultSchema || "");
  result = result.replace("{tables}", JSON.stringify(tables));

  if (response.connectionType === "mongodb") {
    result = mongodbInstructions.replace("{instructions.txt}", result);
  }

  return result;
}

export const defaultTemperature = 0.7;

// Storage keys
export const STORAGE_KEYS = {
  API_KEY: "chatbot_api_key",
  PROVIDER: "chatbot_provider",
  MODEL: "chatbot_model",
  HAS_OPENED_TABLE_RESULT: "chatbot_has_opened_table_result",
};
