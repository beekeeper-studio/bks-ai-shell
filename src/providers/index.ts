import { ClaudeProvider } from "./claudeProvider";
import { MockProvider } from "./mockProvider";

export const Providers = [
  ClaudeProvider,
  MockProvider, // Mock provider for testing
] as const ;

export type ProviderId = typeof Providers[number]["id"];

