import { ClaudeProvider } from "@/providers/anthropic";
import { MockProvider } from "@/providers/mock";
import type { ChatAnthropic } from "@langchain/anthropic";

export type ProviderId = keyof typeof Providers;

export interface ModelConfig {
  /** If not provided, will use the default model */
  temperature?: number;
  modelId: string;
}

export interface IModel {
  id: string;
  displayName: string;
}

export const Providers = {
  claude: ClaudeProvider,
  mock: MockProvider,
}
