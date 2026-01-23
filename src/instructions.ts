import instructions from "../instructions/base.txt?raw";
import mongodbInstructions from "../instructions/mongodb.txt?raw";
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
  result = result.replace("{current_date}", getCurrentDateFormatted());
  result = result.replace("{connection_type}", response.connectionType);
  result = result.replace("{read_only_mode}", getReadOnlyModeInstructions(response.readOnlyMode));
  result = result.replace("{database_name}", response.databaseName);
  result = result.replace("{default_schema}", response.defaultSchema || "");
  result = result.replace("{tables}", JSON.stringify(tables));

  if (response.connectionType === "mongodb") {
    result = mongodbInstructions.replace("{base_instructions}", result);
  } else if (response.connectionType === "surrealdb") {
    // FIXME: We can modify the run_query tool description instead
    result += "\n ## SurrealDB\nIf you need to use the run_query tool, you should use SurrealQL.";
  } else if (response.connectionType === "redis") {
    // FIXME: We can modify the run_query tool description instead
    result += "\n ## Redis\nIf you need to use the run_query tool, you should use redis commands instead of SQL.";
  } else if (response.databaseType === "bigquery") {
    result += "\n ## BigQuery\nIf you need to use the run_query tool, you should use BigQuery's query language. The Database Name you are given is the name of the Dataset we are using. You must qualify any tables in your queries with {dataset}.{table}";
  }

  return result;
}

function getCurrentDateFormatted() {
  const now = new Date();
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  return now.toLocaleDateString(undefined, options);
}

function getReadOnlyModeInstructions(readOnly: boolean) {
  if (readOnly) {
    return "## Read Only Mode\n\nThe connected database is in read-only mode. You MUST only run queries that do not modify the database.";
  }
  return "";
}
