import { BaseProvider } from "@/providers/BaseProvider";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";

export class AwsBedrock extends BaseProvider {
  constructor(
    private options: {
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken: string;
    },
  ) {
    super();
  }

  getModel(id: string) {
    return createAmazonBedrock(this.options).languageModel(id);
  }

  async listModels() {
    throw new Error("Not implemented");
    // return providerConfigs.anthropic.models;
  }
}
