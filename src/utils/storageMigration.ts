// This file moves settings that older versions saved one key each into one
// object per store, which is how the `persist` Pinia plugin saves them.
import {
  appStorage,
  AppStorage,
  getConnectionInfo,
} from "@beekeeperstudio/plugin";

/** Move values that older versions saved one key each into one object. */
async function migrateLegacySettings() {
  if ((await appStorage.get("settings")) !== null) {
    return;
  }

  const legacyKeys = [
    "customInstructions",
    "allowExecutionOfReadOnlyQueries",
    "enableAutoCompact",
    "disabledModels",
    "removedModels",
    "providers_openaiCompat_baseUrl",
    "providers_openaiCompat_headers",
    "providers_ollama_baseUrl",
    "providers_ollama_headers",
    "providers_anthropic_models",
    "providers_google_models",
    "providers_zai_models",
    "providers_openai_models",
    "providers_deepseek_models",
    "providers_openaiCompat_models",
    "providers_ollama_models",
    "providers_mock_models",
  ];
  const legacyState: Record<string, unknown> = {};

  for (const key of legacyKeys) {
    const value = await appStorage.get(key);
    if (value !== null) {
      legacyState[key] = value;
    }
  }

  if (Object.keys(legacyState).length === 0) {
    return;
  }

  await appStorage.set("settings", legacyState);
}

/** Move values that older versions saved one key each into one object. */
async function migrateLegacyEncryptedSettings() {
  const storage = new AppStorage({ encrypted: true });
  if ((await storage.get("encryptedSettings")) !== null) {
    return;
  }

  const legacyKeys = [
    "providers.openai.apiKey",
    "providers.anthropic.apiKey",
    "providers.google.apiKey",
    "providers.zai.apiKey",
    "providers.deepseek.apiKey",
    "providers_openaiCompat_apiKey",
  ];
  const legacyState: Record<string, unknown> = {};

  for (const key of legacyKeys) {
    const value = await storage.get(key);
    if (value !== null) {
      legacyState[key] = value;
    }
  }

  if (Object.keys(legacyState).length === 0) {
    return;
  }

  await storage.set("encryptedSettings", legacyState);
}

/** Move values that older versions saved under `internal.*` into one object. */
async function migrateLegacyInternalData() {
  if ((await appStorage.get("pluginData")) !== null) {
    return;
  }

  const legacyState: Record<string, unknown> = {};

  const lastUsedModelId = await appStorage.get("internal.lastUsedModelId");
  if (lastUsedModelId !== null) {
    legacyState.lastUsedModelId = lastUsedModelId;
  }

  const isFirstTimeUser = await appStorage.get("internal.isFirstTimeUser");
  if (isFirstTimeUser !== null) {
    legacyState.isFirstTimeUser = isFirstTimeUser;
  }

  if (Object.keys(legacyState).length === 0) {
    return;
  }

  await appStorage.set("pluginData", legacyState);
}

/**
 * Older versions saved every connection's instructions in one global list.
 * Only the current connection can be written, so each one moves when opened.
 */
async function migrateLegacyConnectionSettings() {
  const storage = new AppStorage({ scope: "currentConnection" });
  if ((await storage.get("connectionSettings")) !== null) {
    return;
  }

  const legacyInstructions: {
    workspaceId: number;
    connectionId: number;
    instructions: string;
  }[] = (await appStorage.get("customConnectionInstructions")) ?? [];
  const connection = await getConnectionInfo();
  const legacyEntry = legacyInstructions.find(
    (entry) =>
      entry.connectionId === connection.id &&
      entry.workspaceId === connection.workspaceId,
  );

  if (!legacyEntry) {
    return;
  }

  await storage.set("connectionSettings", {
    connectionInstructions: legacyEntry.instructions,
  });
}

// TODO: Remove these migrations once users have had time to update past
// the first release after v3.3.4, where storage moved to one key per store.
export async function migrateLegacyStorage() {
  await migrateLegacySettings();
  await migrateLegacyEncryptedSettings();
  await migrateLegacyInternalData();
  await migrateLegacyConnectionSettings();
}
