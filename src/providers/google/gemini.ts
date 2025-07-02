import { AIMessageChunk, BaseMessage } from "@langchain/core/messages";
import { BaseModel } from "../BaseModel";
import { ToolCallInput } from "@langchain/core/dist/tools/types";

export class GeminiModel extends BaseModel {
  protected async *streamMessages(
    messages: BaseMessage[],
    tools: ToolCallInput
  ): AsyncGenerator<AIMessageChunk> {
    // FIXME streaming is broken for gemini, tools are not handled properly.
    // might be fixed with this PR?
    // see https://github.com/langchain-ai/langchainjs/pull/8393
    yield await this.llm.bindTools!(tools).invoke(messages, {
      signal: this.abortController.signal,
    });
  }
}
