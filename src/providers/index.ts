import { ClaudeProvider } from "@/providers/anthropic";
import { GoogleProvider } from "@/providers/google";

export type ProviderId = typeof Providers[number]['id'];

export interface ModelConfig {
  /** If not provided, will use the default model */
  temperature?: number;
  modelId: string;
}

export interface IModel {
  id: string;
  displayName: string;
}

export const Providers = [
  {
    id: "anthropic" as const,
    displayName: "Claude" as const,
    class: ClaudeProvider,
  },
  {
    id: "google" as const,
    displayName: "Google" as const,
    class: GoogleProvider,
  }
];
