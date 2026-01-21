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

export type AvailableProviders = keyof typeof providerConfigs;

export type AvailableProvidersWithDynamicModels = {
  [K in keyof typeof providerConfigs]: 'supportsRuntimeModels' extends keyof typeof providerConfigs[K]
    ? typeof providerConfigs[K]['supportsRuntimeModels'] extends true
      ? K
      : never
    : never;
}[keyof typeof providerConfigs];

export type AvailableModels<T extends AvailableProviders | unknown = unknown> =
  T extends AvailableProviders
  ? (typeof providerConfigs)[T]["models"][number]
  : (typeof providerConfigs)[AvailableProviders]["models"][number];

export type ModelInfo = {
  id: string;
  displayName: string;
  contextWindow?: number;
};

export const providerConfigs = {
  anthropic: {
    displayName: "Anthropic",
    /** @link https://docs.anthropic.com/en/docs/about-claude/models/overview */
    models: [
      {
        id: "claude-opus-4-5-20251101",
        displayName: "claude-opus-4-5",
        contextWindow: 200_000,
      },
      {
        id: "claude-sonnet-4-5-20250929",
        displayName: "claude-sonnet-4-5",
        contextWindow: 200_000,
      },
      {
        id: "claude-haiku-4-5-20251001",
        displayName: "claude-haiku-4-5",
        contextWindow: 200_000,
      },
      {
        id: "claude-opus-4-1",
        displayName: "claude-opus-4-1",
        contextWindow: 200_000,
      },
      {
        id: "claude-opus-4-20250514",
        displayName: "claude-opus-4",
        contextWindow: 200_000,
      },
      {
        id: "claude-sonnet-4-20250514",
        displayName: "claude-sonnet-4",
        contextWindow: 200_000,
      },
      {
        id: "claude-3-5-haiku-20241022",
        displayName: "claude-haiku-3-5",
        contextWindow: 200_000,
      },
      {
        id: "claude-3-5-sonnet-latest",
        displayName: "claude-3-5-sonnet",
        contextWindow: 200_000,
      },
      {
        id: "claude-3-haiku-20240307",
        displayName: "claude-3-haiku",
        contextWindow: 200_000,
      },

      // Deprecated models
      {
        id: "claude-3-7-sonnet-20250219",
        displayName: "claude-sonnet-3-7",
        contextWindow: 200_000,
      },
    ],
    supportsRuntimeModels: false,
  },
  google: {
    displayName: "Google",
    /** @link https://ai.google.dev/gemini-api/docs/models */
    models: [
      {
        id: "gemini-2.5-pro",
        displayName: "gemini-2.5-pro",
        contextWindow: 1_048_576,
      },
      {
        id: "gemini-2.5-flash",
        displayName: "gemini-2.5-flash",
        contextWindow: 1_048_576,
      },
      {
        id: "gemini-2.5-flash-lite",
        displayName: "gemini-2.5-flash-lite",
        contextWindow: 1_048_576,
      },

      // Deprecated models
      {
        id: "gemini-2.0-flash",
        displayName: "gemini-2.0-flash",
        contextWindow: 1_048_576,
      },
      {
        id: "gemini-2.0-flash-lite",
        displayName: "gemini-2.0-flash-lite",
        contextWindow: 1_048_576,
      },
    ],
    supportsRuntimeModels: false,
  },
  openai: {
    displayName: "OpenAI",
    /** @link https://platform.openai.com/docs/models */
    models: [
      {
        id: "gpt-5.2-pro-2025-12-11",
        displayName: "gpt-5.2-pro",
        contextWindow: 400_000,
      },
      {
        id: "gpt-5.2-2025-12-11",
        displayName: "gpt-5.2",
        contextWindow: 400_000,
      },
      {
        id: "gpt-5.1",
        displayName: "gpt-5.1",
        contextWindow: 400_000,
      },
      {
        id: "gpt-5",
        displayName: "gpt-5",
        contextWindow: 400_000,
      },
      {
        id: "gpt-5-pro-2025-10-06",
        displayName: "gpt-5-pro",
        contextWindow: 400_000,
      },
      {
        id: "gpt-5-mini",
        displayName: "gpt-5-mini",
        contextWindow: 400_000,
      },
      {
        id: "gpt-5-nano",
        displayName: "gpt-5-nano",
        contextWindow: 400_000,
      },
      {
        id: "gpt-4.1",
        displayName: "gpt-4.1",
        contextWindow: 1_047_576,
      },
      {
        id: "gpt-4.1-mini",
        displayName: "gpt-4.1-mini",
        contextWindow: 1_047_576,
      },
      {
        id: "gpt-4.1-nano",
        displayName: "gpt-4.1-nano",
        contextWindow: 1_047_576,
      },
      {
        id: "gpt-4o",
        displayName: "gpt-4o",
        contextWindow: 128_000,
      },
      {
        id: "gpt-4o-mini",
        displayName: "gpt-4o-mini",
        contextWindow: 128_000,
      },
      {
        id: "o3",
        displayName: "o3",
        contextWindow: 200_000,
      },
      {
        id: "o3-mini",
        displayName: "o3-mini",
        contextWindow: 200_000,
      },
      {
        id: "o4-mini",
        displayName: "o4-mini",
        contextWindow: 200_000,
      },
    ],
    supportsRuntimeModels: false,
  },
  openaiCompat: {
    displayName: "OpenAI-Compatible",
    models: [],
    /** Models are fetched at runtime */
    supportsRuntimeModels: true,
  },
  ollama: {
    displayName: "Ollama",
    models: [],
    /** Models are fetched at runtime */
    supportsRuntimeModels: true,
  },
  mock: {
    displayName: "[DEV] Mock",
    models: [
      {
        id: "mock-fast",
        displayName: "[DEV] Mock fast",
        contextWindow: 200_000,
      },
      {
        id: "mock-slow",
        displayName: "[DEV] Mock slow",
        contextWindow: 200_000,
      },
      {
        id: "mock-high-usage",
        displayName: "[DEV] Mock high usage (85%)",
        contextWindow: 200_000,
      },
      {
        id: "mock-overflow",
        displayName: "[DEV] Mock overflow (100%)",
        contextWindow: 200_000,
      },
    ],
    supportsRuntimeModels: false,
  },
} as const;

export const disabledModelsByDefault: {
  providerId: AvailableProviders;
  modelId: string;
}[] = [
    // Google's deprecated models
    // https://ai.google.dev/gemini-api/docs/deprecations
    {
      providerId: "google" as const,
      modelId: "gemini-2.0-flash",
    },
    {
      providerId: "google" as const,
      modelId: "gemini-2.0-flash-lite",
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
    // https://docs.claude.com/en/docs/about-claude/model-deprecations
    {
      providerId: "anthropic" as const,
      modelId: "claude-3-5-sonnet-latest",
    },
    {
      providerId: "anthropic" as const,
      modelId: "claude-3-7-sonnet-20250219",
    },
  ];
