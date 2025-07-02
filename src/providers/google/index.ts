import { ModelConfig } from "@/providers";
import { BaseModel } from "@/providers/BaseModel";
import { BaseProvider } from "@/providers/BaseProvider";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { GoogleGenAI } from "@google/genai";

export class GoogleProvider extends BaseProvider {
  private apiKey = "";

  public async initialize(apiKey: string): Promise<void> {
    const ai = new GoogleGenAI({ apiKey });
    const modelPager = await ai.models.list();
    this.models = [];
    for await (const model of modelPager) {
      if (model.name) {
        this.models.push({
          id: model.name,
          displayName: model.displayName || model.name,
        });
      }
    }
    this.apiKey = apiKey;
  }

  public createModel(config: ModelConfig): BaseModel {
    const model = this.findModelAndThrow(config.modelId);
    const llm = new ChatGoogleGenerativeAI({
      apiKey: this.apiKey,
      model: model.id,
      temperature: config.temperature,
    });
    return new BaseModel(llm);
  }
}
