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
  result = result.replace("{current_date}", getCurrentDateFormatted());
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
      { id: "claude-opus-4-0", displayName: "Claude Opus 4" },
      { id: "claude-sonnet-4-0", displayName: "Claude Sonnet 4" },
      { id: "claude-3-7-sonnet-latest", displayName: "Claude Sonnet 3.7" },
      { id: "claude-3-5-haiku-latest", displayName: "Claude Haiku 3.5" },
      {
        id: "claude-3-5-sonnet-latest",
        displayName: "Claude Sonnet 3.5 Latest",
      },
      { id: "claude-3-haiku", displayName: "Claude Haiku 3" },
    ],
  },
  google: {
    displayName: "Google",
    /** https://ai.google.dev/gemini-api/docs/models */
    models: [
      { id: "gemini-2.5-pro", displayName: "Gemini 2.5 Pro" },
      { id: "gemini-2.5-flash", displayName: "Gemini 2.5 Flash" },
      {
        id: "gemini-2.5-flash-lite-preview-06-17",
        displayName: "Gemini 2.5 Flash-Lite Preview",
      },
      { id: "gemini-2.0-flash", displayName: "Gemini 2.0 Flash" },
      { id: "gemini-2.0-flash-lite", displayName: "Gemini 2.0 Flash-Lite" },
      { id: "gemini-1.5-flash", displayName: "Gemini 1.5 Flash" },
      { id: "gemini-1.5-flash-8b", displayName: "Gemini 1.5 Flash-8B" },
      { id: "gemini-1.5-pro", displayName: "Gemini 1.5 Pro" },
    ],
  },
  openai: {
    displayName: "OpenAI",
    models: [
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
  ];
