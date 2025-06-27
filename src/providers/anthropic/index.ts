import { ModelConfig } from "@/providers";
import { BaseModel } from "@/providers/BaseModel";
import { BaseProvider } from "@/providers/BaseProvider";
import { ChatAnthropic, type AnthropicInput } from "@langchain/anthropic";
import { Anthropic } from "@anthropic-ai/sdk";

export class ClaudeProvider extends BaseProvider {
  public static id = "claude" as const;
  public static displayName = "Claude" as const;

  private apiKey = "";

  public async initialize(apiKey: string): Promise<void> {
    const anthropicClient = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true,
    });
    this.models = await anthropicClient.models.list().then(({ data }) =>
      data.map((model) => ({
        id: model.id,
        displayName: model.display_name,
      })),
    );
    this.apiKey = apiKey;
  }

  public createModel(config: ModelConfig): BaseModel {
    const model = this.models.find((m) => m.id === config.modelId);

    if (!model) {
      throw new Error(`Unknown Claude model: ${config.modelId}`);
    }

    try {
      const chatConfig: AnthropicInput & { dangerouslyAllowBrowser?: boolean } =
        {
          apiKey: this.apiKey,
          model: model.id,
          temperature: config.temperature,
          dangerouslyAllowBrowser: true,
        };
      const llm = new ChatAnthropic(chatConfig);
      return new BaseModel(model.id, model.displayName, llm);
    } catch (error) {
      console.error("Error initializing Claude model:", error);
      throw error;
    }
  }
}
