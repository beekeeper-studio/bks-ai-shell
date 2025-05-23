/**
 * Mock provider for testing and demonstration purposes
 */

import { IChatMessage, IModel, IModelConfig } from "../types";
import { BaseModelProvider, BaseProvider } from "./BaseModelProvider";

export class MockProvider extends BaseProvider {
    public initialize(apiKey: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
    public createModel(config: IModelConfig): BaseModelProvider {
        throw new Error("Method not implemented.");
    }
}

export class MockModelProvider extends BaseModelProvider {
  public static id = "mock" as const;
  public static displayName = "Mock" as const;

  protected model: IModel = {
    id: "mock-standard",
    displayName: "MockAI Standard",
  };

  private responses: Record<string, string> = {
    Hello: "Hello! How can I help you with your database today?",
    "What can you do?":
      "I can help you analyze your database, generate SQL queries, explain query results, and provide suggestions to optimize your database operations.",
    Help: "I'm here to assist with database questions and SQL queries. Try asking me about table structures, queries, or best practices!",
  };

  private defaultResponse: string =
    "I'm your database assistant. I can help you understand your data, write queries, and explain database concepts.";

  getModel(): IModel {
    return this.model;
  }

  switchModel(modelId: string): Promise<void> {
    throw new Error("Method not implemented.");
  }

  getProviderName(): string {
    return "MockAI";
  }

  async initialize(): Promise<void> {
    // do nothing
  }

  async getAvailableModels(): Promise<IModel[]> {
    return [this.model];
  }

  async sendMessage(
    message: string,
    conversationHistory: IChatMessage[],
  ): Promise<string> {
    // Add a small delay to simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Check for exact matches in our response library
    if (this.responses[message]) {
      return this.responses[message];
    }

    // Generate a dynamic response based on conversation length
    let response = this.defaultResponse;
    response += `\n\nAs a database assistant, I can provide more detailed responses. Your conversation history has ${conversationHistory.length} messages.`;

    return response;
  }

  async disconnect(): Promise<void> {
    // do nothing
  }
}
