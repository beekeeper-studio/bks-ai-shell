import { BaseModelProvider } from './baseProvider';
import { IModelConfig } from '../../types';
import { ProviderId, Providers } from '../../configs';

/**
 * Create a provider instance based on type
 */
export function createModelProvider(id: ProviderId, config: IModelConfig): BaseModelProvider {
  const foundProvider = Providers.find((p) => p.id === id);
  if (!foundProvider) {
    throw new Error(`Unknown provider type: ${id}`);
  }
  return new foundProvider.class(config);
}
