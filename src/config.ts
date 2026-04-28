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
        id: 'claude-opus-4-7',
        displayName: 'claude-opus-4-7',
        contextWindow: 1_000_000,
        temperature: 1,
      },
      {
        id: "claude-sonnet-4-6",
        displayName: "claude-sonnet-4-6",
        contextWindow: 1_000_000,
        temperature: defaultTemperature,
      },
      {
        id: "claude-opus-4-6",
        displayName: "claude-opus-4-6",
        contextWindow: 1_000_000,
        temperature: defaultTemperature,
      },
      {
        id: "claude-opus-4-5-20251101",
        displayName: "claude-opus-4-5",
        contextWindow: 200_000,
        temperature: defaultTemperature,
      },
      {
        id: "claude-sonnet-4-5-20250929",
        displayName: "claude-sonnet-4-5",
        contextWindow: 200_000,
        temperature: defaultTemperature,
      },
      {
        id: "claude-haiku-4-5-20251001",
        displayName: "claude-haiku-4-5",
        contextWindow: 200_000,
        temperature: defaultTemperature,
      },
      {
        id: "claude-opus-4-1",
        displayName: "claude-opus-4-1",
        contextWindow: 200_000,
        temperature: defaultTemperature,
      },
      {
        id: "claude-opus-4-20250514",
        displayName: "claude-opus-4",
        contextWindow: 200_000,
        temperature: defaultTemperature,
      },
      {
        id: "claude-sonnet-4-20250514",
        displayName: "claude-sonnet-4",
        contextWindow: 200_000,
        temperature: defaultTemperature,
      },
    ],
    supportsRuntimeModels: false,
  },
  google: {
    displayName: "Google",
    /** @link https://ai.google.dev/gemini-api/docs/models */
    models: [
      {
        id: "gemini-3-flash-preview",
        displayName: "gemini-3-flash-preview",
        contextWindow: 1_048_576,
        temperature: defaultTemperature,
      },
      {
        id: "gemini-2.5-pro",
        displayName: "gemini-2.5-pro",
        contextWindow: 1_048_576,
        temperature: defaultTemperature,
      },
      {
        id: "gemini-2.5-flash",
        displayName: "gemini-2.5-flash",
        contextWindow: 1_048_576,
        temperature: defaultTemperature,
      },
      {
        id: "gemini-2.5-flash-lite",
        displayName: "gemini-2.5-flash-lite",
        contextWindow: 1_048_576,
        temperature: defaultTemperature,
      },
      {
        id: "gemini-2.0-flash",
        displayName: "gemini-2.0-flash",
        contextWindow: 1_048_576,
        temperature: defaultTemperature,
      },
      {
        id: "gemini-2.0-flash-lite",
        displayName: "gemini-2.0-flash-lite",
        contextWindow: 1_048_576,
        temperature: defaultTemperature,
      },
    ],
    supportsRuntimeModels: false,
  },
  openai: {
    displayName: "OpenAI",
    /** @link https://platform.openai.com/docs/models */
    models: [
      {
        id: "gpt-5.4",
        displayName: "gpt-5.4",
        contextWindow: 1_000_000,
        temperature: 1,
      },
      {
        id: "gpt-5.4-mini",
        displayName: "gpt-5.4-mini",
        contextWindow: 400_000,
        temperature: 1,
      },
      {
        id: "gpt-5.4-nano",
        displayName: "gpt-5.4-nano",
        contextWindow: 400_000,
        temperature: 1,
      },
      {
        id: "gpt-5.2-pro-2025-12-11",
        displayName: "gpt-5.2-pro",
        contextWindow: 400_000,
        temperature: 1,
      },
      {
        id: "gpt-5.2-2025-12-11",
        displayName: "gpt-5.2",
        contextWindow: 400_000,
        temperature: 1,
      },
      {
        id: "gpt-5.1",
        displayName: "gpt-5.1",
        contextWindow: 400_000,
        temperature: 1,
      },
      {
        id: "gpt-5",
        displayName: "gpt-5",
        contextWindow: 400_000,
        temperature: 1,
      },
      {
        id: "gpt-5-pro-2025-10-06",
        displayName: "gpt-5-pro",
        contextWindow: 400_000,
        temperature: 1,
      },
      {
        id: "gpt-5-mini",
        displayName: "gpt-5-mini",
        contextWindow: 400_000,
        temperature: 1,
      },
      {
        id: "gpt-5-nano",
        displayName: "gpt-5-nano",
        contextWindow: 400_000,
        temperature: 1,
      },
      {
        id: "gpt-4.1",
        displayName: "gpt-4.1",
        contextWindow: 1_047_576,
        temperature: defaultTemperature,
      },
      {
        id: "gpt-4.1-mini",
        displayName: "gpt-4.1-mini",
        contextWindow: 1_047_576,
        temperature: defaultTemperature,
      },
      {
        id: "gpt-4.1-nano",
        displayName: "gpt-4.1-nano",
        contextWindow: 1_047_576,
        temperature: defaultTemperature,
      },
      {
        id: "gpt-4o",
        displayName: "gpt-4o",
        contextWindow: 128_000,
        temperature: defaultTemperature,
      },
      {
        id: "gpt-4o-mini",
        displayName: "gpt-4o-mini",
        contextWindow: 128_000,
        temperature: defaultTemperature,
      },
      {
        id: "o3",
        displayName: "o3",
        contextWindow: 200_000,
        temperature: defaultTemperature,
      },
      {
        id: "o3-mini",
        displayName: "o3-mini",
        contextWindow: 200_000,
        temperature: defaultTemperature,
      },
      {
        id: "o4-mini",
        displayName: "o4-mini",
        contextWindow: 200_000,
        temperature: defaultTemperature,
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
        id: "mock",
        displayName: "[DEV] Mock",
        contextWindow: 32_000,
        temperature: defaultTemperature,
      },
      {
        id: "mock-compact",
        displayName: "[DEV] Mock compact",
        contextWindow: 64_000,
        temperature: defaultTemperature,
      },
    ],
    supportsRuntimeModels: false,
  },
} as const;

/**
 * Deprecated models are disabled by default. They are still available for use,
 * but when the retirement date is met, they will be removed.
 **/
export const disabledModelsByDefault: {
  providerId: AvailableProviders;
  modelId: string;
}[] = [
    // ===== Google =====
    // https://ai.google.dev/gemini-api/docs/deprecations

    // Retirement date: June 17, 2026
    {
      providerId: "google" as const,
      modelId: "gemini-2.5-pro",
    },

    // Retirement date: June 1, 2026
    {
      providerId: "google" as const,
      modelId: "gemini-2.0-flash",
    },

    // Retirement date: June 1, 2026
    {
      providerId: "google" as const,
      modelId: "gemini-2.0-flash-lite",
    },

    // ===== OpenAI =====
    // https://platform.openai.com/docs/deprecations

    //
    //

    // ===== Anthropic =====
    // https://docs.claude.com/en/docs/about-claude/model-deprecations

    // Retirement date: June 15, 2026
    {
      providerId: "anthropic" as const,
      modelId: "claude-opus-4-20250514",
    },

    // Retirement date: June 15, 2026
    {
      providerId: "anthropic" as const,
      modelId: "claude-sonnet-4-20250514",
    },
  ];
