import { BaseModelProvider } from "../services/providers/baseProvider";
import { ClaudeProvider } from "../services/providers/claudeProvider";
import { MockProvider } from "../services/providers/mockProvider";

export type ProviderId = "claude" | "mock";

interface ProviderConfiguration {
  id: ProviderId;
  class: {
    new (
      ...args: ConstructorParameters<typeof BaseModelProvider>
    ): BaseModelProvider;
  } & typeof BaseModelProvider;
}

export const Providers: ProviderConfiguration[] = [
  { id: "claude", class: ClaudeProvider },
  /** Mock provider for testing */
  { id: "mock", class: MockProvider },
];

/** Constant values used by the UI */
export const UIProviders = Providers.map((p) => ({
  id: p.id,
  label: p.class.displayName,
}));
