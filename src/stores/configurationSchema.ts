import { disabledModelsByDefault, providerConfigs } from "@/config";
import z from "zod/v3";

function zodEnumFromObjKeys<K extends string>(
  obj: Record<K, any>,
): z.ZodEnum<[K, ...K[]]> {
  const [firstKey, ...otherKeys] = Object.keys(obj) as K[];
  return z.enum([firstKey, ...otherKeys]);
}

const ModelSchema = z.object({
  id: z.string(),
  displayName: z.string(),
});

const configurableSchema = z.object({
  // ==== GENERAL ====
  /** Append custom instructions to the default system instructions. */
  customInstructions: z.string().default(""),
  /** Append custom instructions to the default system instructions.
   * It's applied based on the connection ID */
  customConnectionInstructions: z
    .array(
      z.object({
        workspaceId: z.number(),
        connectionId: z.number(),
        instructions: z.string(),
      }),
    )
    .default([]),
  allowExecutionOfReadOnlyQueries: z.boolean().default(false),
  enableAutoCompact: z.boolean().default(true),

  // ==== MODELS ====
  /** List of disabled models by id. */
  disabledModels: z
    .array(
      z.object({
        providerId: zodEnumFromObjKeys(providerConfigs),
        modelId: z.string(),
      }),
    )
    .default(disabledModelsByDefault),
  removedModels: z
    .array(
      z.object({
        providerId: zodEnumFromObjKeys(providerConfigs),
        modelId: z.string(),
      }),
    )
    .default([]),

  providers_openaiCompat_baseUrl: z.string().default(""),
  providers_openaiCompat_headers: z.string().default(""),
  providers_ollama_baseUrl: z.string().default("http://localhost:11434"),
  providers_ollama_headers: z.string().default(""),

  providers_mock_models: z.array(ModelSchema).default([]),
  providers_openai_models: z.array(ModelSchema).default([]),
  providers_anthropic_models: z.array(ModelSchema).default([]),
  providers_google_models: z.array(ModelSchema).default([]),
  providers_openaiCompat_models: z.array(ModelSchema).default([]),
  providers_ollama_models: z.array(ModelSchema).default([]),
});

const encryptedConfigurableSchema = z.object({
  "providers.openai.apiKey": z.string().default(""),
  "providers.anthropic.apiKey": z.string().default(""),
  "providers.google.apiKey": z.string().default(""),
  providers_openaiCompat_apiKey: z.string().default(""),
});

const workspaceConfigurableSchema = z.object({
  workspaceConnectionInstructions: z.string().default(""),
});

export const encryptedConfigurableShape = encryptedConfigurableSchema.shape;

export type Model = z.infer<typeof ModelSchema>;
export type Configurable = z.infer<typeof configurableSchema>;
export type ConfigurationState = typeof defaultConfiguration;

export function isEncryptedConfig(
  config: string,
): config is keyof z.infer<typeof encryptedConfigurableSchema> {
  return config in encryptedConfigurableSchema.shape;
}

export function isWorkspaceConfig(
  config: string,
): config is keyof z.infer<typeof workspaceConfigurableSchema> {
  return config in workspaceConfigurableSchema.shape;
}

export const defaultConfiguration = {
  ...configurableSchema.parse({}),
  ...encryptedConfigurableSchema.parse({}),
  ...workspaceConfigurableSchema.parse({}),
};
