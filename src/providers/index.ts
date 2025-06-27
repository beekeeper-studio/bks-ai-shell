import { ClaudeProvider } from "./ClaudeProvider";
import { MockProvider } from "./MockProvider";

export type { BaseProvider } from "./BaseModelProvider";

export type ProviderId = keyof typeof Providers;

export const Providers = {
  claude: ClaudeProvider,
  mock: MockProvider,
}

export function getProviderIds() {

}
