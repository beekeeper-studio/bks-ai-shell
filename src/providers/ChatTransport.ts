import { DefaultChatTransport } from "ai";
import type { UIMessage } from "@/types";
import type { FetchFunction } from "@ai-sdk/provider-utils";
import { tools } from "@/tools";
import { createProvider } from ".";
import { useChatStore } from "@/stores/chat";

export class ChatTransport extends DefaultChatTransport<UIMessage> {
  protected fetch = async (
    _url: Parameters<FetchFunction>[0],
    fetchOptions: Parameters<FetchFunction>[1],
  ) => {
    if (!fetchOptions) {
      throw new Error("Fetch options are missing");
    }

    if (!fetchOptions.body) {
      throw new Error("Fetch does not have a body");
    }

    const chat = useChatStore();
    if (!chat.model) {
      throw new Error("No model selected");
    }

    const m = JSON.parse(fetchOptions.body as string) as {
      messages: UIMessage[];
    };

    const provider = createProvider(chat.model.provider);
    return provider.stream({
      modelId: chat.model.id,
      messages: m.messages,
      signal: fetchOptions.signal ?? undefined,
      tools,
      systemPrompt: chat.systemPrompt,
    });
  }
}
