import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { AvailableProviders } from "@/config";

export function createProvider(
  providerId: AvailableProviders,
  options?: {
    apiKey?: string;
  },
) {
  switch (providerId) {
    case "google":
      return createGoogleGenerativeAI({
        apiKey: options?.apiKey,
      });
    case "anthropic":
      return createAnthropic({
        apiKey: options?.apiKey,
        headers: { "anthropic-dangerous-direct-browser-access": "true" },
      });
    case "openai":
      return createOpenAI({
        compatibility: "strict",
        apiKey: options?.apiKey,
      });
    default:
      throw new Error("Unknown provider");
  }
}
