import { BaseModelProvider } from "./baseProvider";
import { ProviderId, Providers } from ".";

/**
 * Create a provider instance based on type
 */
export async function createModelProvider(
  id: ProviderId,
  apiKey: string,
): Promise<BaseModelProvider> {
  const foundProvider = Providers.find((p) => p.id === id);
  if (!foundProvider) {
    throw new Error(`Unknown provider type: ${id}`);
  }
  return await foundProvider.create(apiKey);
}
