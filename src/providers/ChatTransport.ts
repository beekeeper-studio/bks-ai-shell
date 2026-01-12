import { DefaultChatTransport } from "ai";
import { UIMessage, SendOptions } from "@/types";
import { FetchFunction } from "@ai-sdk/provider-utils";
import { tools } from "@/tools";
import { createProvider } from ".";

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

    const m = JSON.parse(fetchOptions.body as string) as {
      messages: UIMessage[];
      sendOptions: SendOptions;
    };
    const sendOptions = m.sendOptions;
    const provider = createProvider(sendOptions.providerId);
    return provider.stream({
      modelId: sendOptions.modelId,
      messages: m.messages,
      signal: fetchOptions.signal,
      tools,
      systemPrompt: sendOptions.systemPrompt,
    });
  }
}
