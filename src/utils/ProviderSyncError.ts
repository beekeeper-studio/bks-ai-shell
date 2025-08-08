import { AvailableProviders } from "@/config";

export class ProviderSyncError extends Error {
  providerId: AvailableProviders;

  constructor(message: string, options: ErrorOptions & { providerId: AvailableProviders }) {
    super(message, options);
    this.providerId = options.providerId;
    this.name = "ProviderSyncError";
  }
}
