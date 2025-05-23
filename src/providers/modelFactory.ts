import { BaseProvider } from "./BaseModelProvider";
import { ClaudeProvider } from "./ClaudeProvider";
import { MockProvider } from "./MockProvider";

export type ProviderId = (typeof Providers)[number]["id"];

export const Providers = [
  ClaudeProvider,
  MockProvider, // Mock provider for testing
] as const;

/**
 * Create a provider instance based on type
 */
export async function createProvider(
  id: ProviderId,
  apiKey: string,
): Promise<BaseProvider> {
  const foundProvider = Providers.find((p) => p.id === id);
  if (!foundProvider) {
    throw new Error(`Unknown provider type: ${id}`);
  }
  const provider = new foundProvider();
  await provider.initialize(apiKey);
  return provider;
}
