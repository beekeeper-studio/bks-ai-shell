import type { AvailableProviders } from "@/config";

export class ProviderSyncError extends Error {
  providerId: AvailableProviders;

  constructor(message: string, options: { cause?: unknown; providerId: AvailableProviders }) {
    super(message, { cause: options.cause });
    this.providerId = options.providerId;
    this.name = "ProviderSyncError";
  }
}
