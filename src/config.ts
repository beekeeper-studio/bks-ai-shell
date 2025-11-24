import { readonly } from "vue";
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

export const defaultTemperature = 0.7;

// Storage keys
export const STORAGE_KEYS = {
  API_KEY: "chatbot_api_key",
  PROVIDER: "chatbot_provider",
  MODEL: "chatbot_model",
  HAS_OPENED_TABLE_RESULT: "chatbot_has_opened_table_result",
};

export type AvailableProviders = keyof typeof providerConfigs;

export type AvailableProvidersWithDynamicModels = {
  [K in keyof typeof providerConfigs]: 'dynamicModels' extends keyof typeof providerConfigs[K]
    ? typeof providerConfigs[K]['dynamicModels'] extends true
      ? K
      : never
    : never;
}[keyof typeof providerConfigs];

export type AvailableModels<T extends AvailableProviders | unknown = unknown> =
  T extends AvailableProviders
  ? (typeof providerConfigs)[T]["models"][number]
  : (typeof providerConfigs)[AvailableProviders]["models"][number];

export const providerConfigs = {
  anthropic: {
    displayName: "Anthropic",
    /** https://docs.anthropic.com/en/docs/about-claude/models/overview */
    models: [
      { id: "claude-sonnet-4-5-20250929", displayName: "claude-sonnet-4-5" },
      { id: "claude-haiku-4-5-20251001", displayName: "claude-haiku-4-5" },
      { id: "claude-opus-4-1", displayName: "claude-opus-4-1" },
      { id: "claude-opus-4-20250514", displayName: "claude-opus-4" },
      { id: "claude-sonnet-4-20250514", displayName: "claude-sonnet-4" },
      { id: "claude-3-7-sonnet-20250219", displayName: "claude-sonnet-3-7" },
      { id: "claude-3-5-haiku-20241022", displayName: "claude-haiku-3-5" },
      {
        id: "claude-3-5-sonnet-latest",
        displayName: "claude-3-5-sonnet",
      },
      { id: "claude-3-haiku-20240307", displayName: "claude-3-haiku" },
    ],
  },
  google: {
    displayName: "Google",
    /** https://ai.google.dev/gemini-api/docs/models */
    models: [
      { id: "gemini-2.5-pro", displayName: "gemini-2.5-pro" },
      { id: "gemini-2.5-flash", displayName: "gemini-2.5-flash" },
      {
        id: "gemini-2.5-flash-lite-preview-06-17",
        displayName: "gemini-2.5-flash-lite-preview",
      },
      { id: "gemini-2.0-flash", displayName: "gemini-2.0-flash" },
      { id: "gemini-2.0-flash-lite", displayName: "gemini-2.0-flash-lite" },
      { id: "gemini-1.5-flash", displayName: "gemini-1.5-flash" },
      { id: "gemini-1.5-flash-8b", displayName: "gemini-1.5-flash-8b" },
      { id: "gemini-1.5-pro", displayName: "gemini-1.5-pro" },
    ],
  },
  openai: {
    displayName: "OpenAI",
    /** https://platform.openai.com/docs/models */
    models: [
      { id: "gpt-5.1", displayName: "gpt-5.1" },
      { id: "gpt-5", displayName: "gpt-5" },
      { id: "gpt-5-mini", displayName: "gpt-5-mini" },
      { id: "gpt-5-nano", displayName: "gpt-5-nano" },
      { id: "gpt-4.1", displayName: "gpt-4.1" },
      { id: "gpt-4.1-mini", displayName: "gpt-4.1-mini" },
      { id: "gpt-4.1-nano", displayName: "gpt-4.1-nano" },
      { id: "gpt-4o", displayName: "gpt-4o" },
      { id: "gpt-4o-mini", displayName: "gpt-4o-mini" },
      { id: "o3", displayName: "o3" },
      { id: "o3-mini", displayName: "o3-mini" },
      { id: "o4-mini", displayName: "o4-mini" },
    ],
  },
  awsBedrock: {
    displayName: "AWS Bedrock",
    models: [],
    dynamicModels: true,
  },
  openaiCompat: {
    displayName: "OpenAI-Compatible",
    models: [],
    dynamicModels: true,
  },
  ollama: {
    displayName: "Ollama",
    models: [],
    dynamicModels: true,
  },
} as const;

export const disabledModelsByDefault: {
  providerId: AvailableProviders;
  modelId: string;
}[] = [
    // Disabling this by default because they are not listed in the gemini docs anymore
    {
      providerId: "google" as const,
      modelId: "gemini-1.5-flash",
    },
    {
      providerId: "google" as const,
      modelId: "gemini-1.5-flash-8b",
    },
    {
      providerId: "google" as const,
      modelId: "gemini-1.5-pro",
    },

    // FIXME: Can't use o3, o3-mini, and o4-mini because of this error when sending a message
    // {
    //   "error": {
    //     "message": "Invalid schema for function 'get_tables': In context=(), 'required' is required to be supplied and to be an array including every key in properties. Missing 'schema'.",
    //     "type": "invalid_request_error",
    //     "param": "tools[0].function.parameters",
    //     "code": "invalid_function_parameters"
    //   }
    // }
    {
      providerId: "openai" as const,
      modelId: "o3",
    },
    {
      providerId: "openai" as const,
      modelId: "o3-mini",
    },
    {
      providerId: "openai" as const,
      modelId: "o4-mini",
    },

    // Deprecated models
    // anthropic: https://docs.claude.com/en/docs/about-claude/model-deprecations
    {
      providerId: "anthropic" as const,
      modelId: "claude-3-5-sonnet-latest",
    },
  ];
