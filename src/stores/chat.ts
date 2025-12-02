import { defineStore } from "pinia";
import {
  AvailableModels,
  AvailableProviders,
  AvailableProvidersWithDynamicModels,
  getDefaultInstructions,
  providerConfigs,
} from "@/config";
import { useConfigurationStore } from "./configuration";
import { useInternalDataStore } from "./internalData";
import { useTabState } from "./tabState";
import { createProvider } from "@/providers";
import _ from "lodash";
import { ProviderSyncError } from "@/utils/ProviderSyncError";
import { getAppVersion, getConnectionInfo, GetConnectionInfoResponse, getTables } from "@beekeeperstudio/plugin";
import type { Entity } from "@beekeeperstudio/ui-kit";
import type { SendOptions } from "@/composables/ai";

export type Model = AvailableModels & {
  provider: AvailableProviders;
  providerDisplayName: (typeof providerConfigs)[AvailableProviders]["displayName"];
  enabled: boolean;
  /** Available if the api key is set. */
  available: boolean;
  removable: boolean;
};

type ChatState = {
  /** The active model. E.g. Claude 4 Sonnet, Claude 3.5, etc. */
  model?: Model;
  errors: ProviderSyncError[];
  defaultInstructions: string;
  entities: Entity[];
  // FIXME make a new type
  connectionInfo: GetConnectionInfoResponse['result'];
  appVersion: Awaited<ReturnType<typeof getAppVersion>>;
};

// the first argument is a unique id of the store across your application
export const useChatStore = defineStore("chat", {
  state: (): ChatState => ({
    model: undefined,
    errors: [],
    defaultInstructions: "",
    entities: [],
    connectionInfo: {
      id: -1,
      connectionType: "postgresql",
      databaseType: "mysql",
      workspaceId: -1,
      connectionName: "",
      databaseName: "",
      readOnlyMode: true,
    },
    appVersion: "",
  }),
  getters: {
    models() {
      const config = useConfigurationStore();
      const openaiModels = providerConfigs.openai.models.map((m) => ({
        ...m,
        provider: "openai" as const,
        providerDisplayName: providerConfigs.openai.displayName,
        available: !!config["providers.openai.apiKey"],
        enabled:
          !!config["providers.openai.apiKey"] &&
          !config.disabledModels.some(
            (disabled) =>
              m.id === disabled.modelId && disabled.providerId === "openai",
          ),
        removable: false,
      }));
      const anthropicModels = providerConfigs.anthropic.models.map((m) => ({
        ...m,
        provider: "anthropic" as const,
        providerDisplayName: providerConfigs.anthropic.displayName,
        available: !!config["providers.anthropic.apiKey"],
        enabled:
          !!config["providers.anthropic.apiKey"] &&
          !config.disabledModels.some(
            (disabled) =>
              m.id === disabled.modelId && disabled.providerId === "anthropic",
          ),
        removable: false,
      }));
      const googleModels = providerConfigs.google.models.map((m) => ({
        ...m,
        provider: "google" as const,
        providerDisplayName: providerConfigs.google.displayName,
        available: !!config["providers.google.apiKey"],
        enabled:
          !!config["providers.google.apiKey"] &&
          !config.disabledModels.some(
            (disabled) =>
              m.id === disabled.modelId && disabled.providerId === "google",
          ),
        removable: false,
      }));
      const userDefinedModels = config.models.map((m) => ({
        ...m,
        provider: m.providerId,
        providerDisplayName: providerConfigs[m.providerId].displayName,
        available: true,
        enabled: !config.disabledModels.some(
          (disabled) =>
            m.id === disabled.modelId && disabled.providerId === m.providerId,
        ),
        removable: false,
      }));

      return [
        ...openaiModels,
        ...anthropicModels,
        ...googleModels,
        ...userDefinedModels,
      ];
    },
    systemPrompt(state) {
      const config = useConfigurationStore();
      return (state.defaultInstructions + "\n" + config.customInstructions).trim();
    },
    // FIXME move this to UI Kit?
    formatterDialect() {
      const d = this.connectionInfo.databaseType;
      if (d === 'sqlserver') return 'tsql'
      if (d === 'sqlite') return 'sqlite'
      if (d === 'oracle') return 'plsql'
      if (d === 'postgresql') return 'postgresql'
      if (d === 'redshift') return 'redshift'
      if (d === 'cassandra') return 'sql'
      if (d === 'duckdb') return 'sql'
      if (d === 'trino') return 'trino'
      if (d === 'surrealdb') return 'sql'
      return 'mysql' // we want this as the default
    },
    // FIXME move this to UI Kit?
    identifierDialect() {
      const mappings = {
        sqlserver: "mssql",
        sqlite: "sqlite",
        cockroachdb: "psql",
        postgresql: "psql",
        mysql: "mysql",
        mariadb: "mysql",
        tidb: "mysql",
        redshift: "psql",
      };
      return mappings[this.connectionInfo.databaseType] || "generic";
    },
    languageId() {
      const d = this.connectionInfo.databaseType;
      if (d === "cassandra") return "text/x-cassandra";
      if (d === "clickhouse") return "text/x-mysql";
      if (d === "mysql" || d === "mariadb") return "text/x-mysql";
      if (d === "postgresql" || d === "redshift") return "text/x-pgsql";
      if (d === "redis") return "text/x-redis";
      if (d === "sqlite" || d === "libsql") return "text/x-sqlite";
      return "text/x-sql";
    },
    /** For `ai.ts` */
    sendOptions(): SendOptions {
      return {
        modelId: this.model?.id!,
        providerId: this.model?.provider!,
        systemPrompt: this.systemPrompt,
      }
    },
  },
  actions: {
    async initialize() {
      const internal = useInternalDataStore();
      const config = useConfigurationStore();
      const tabState = useTabState();
      await config.sync();
      await internal.sync();
      await tabState.sync();

      this.model =
        this.models.find(
          (m) => m.id === internal.lastUsedModelId && m.enabled,
        ) || this.models.find((m) => m.enabled);

      internal.lastUsedModelId = this.model?.id;

      this.syncProvider("openaiCompat");
      this.syncProvider("ollama");
      getDefaultInstructions().then((instructions) => {
        this.defaultInstructions = instructions;
      }).catch(console.error);
      getTables().then((tables) => {
        this.entities = tables.map((table) => ({
          name: table.name,
          schema: table.schema,
          entityType: "table",
        }));
      }).catch(console.error);
      getAppVersion().then((version) => {
        this.appVersion = version;
      });
      getConnectionInfo().then((info) => {
        this.connectionInfo = info;
      }).catch(console.error);
    },
    /** List the models for a provider and store them in the internal data store. */
    async syncProvider(provider: AvailableProvidersWithDynamicModels) {
      const config = useConfigurationStore();
      try {
        const errorIdx = this.errors.findIndex(
          (e) => e.providerId === provider,
        );
        if (errorIdx !== -1) {
          this.errors.splice(errorIdx, 1);
        }
        const models = await createProvider(provider).listModels();
        config.setModels(provider, models);
      } catch (e) {
        if (provider === "ollama" && e instanceof TypeError && e.message === "Failed to fetch") {
          this.errors.push(
            new ProviderSyncError(
              "Failed to fetch models from Ollama. [1]",
              {
                providerId: provider,
                cause: e,
              },
            )
          )
        } else {
          console.error(e);
          this.errors.push(
            new ProviderSyncError(e.message, {
              providerId: provider,
              cause: e,
            }),
          );
        }
        config.setModels(provider, []);
      }
    },
  },
});
