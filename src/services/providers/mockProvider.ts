/**
 * Mock provider for testing and demonstration purposes
 */

import { BaseModelProvider } from './baseProvider';
import { IConversationMessage, IModel } from '../../types';
import { DEFAULT_CONFIG } from '../../config';

export class MockProvider extends BaseModelProvider {
  private responses: Record<string, string> = {
    'Hello': 'Hello! How can I help you with your database today?',
    'What can you do?': 'I can help you analyze your database, generate SQL queries, explain query results, and provide suggestions to optimize your database operations.',
    'Help': 'I\'m here to assist with database questions and SQL queries. Try asking me about table structures, queries, or best practices!'
  };
  private defaultResponse: string = "I'm your database assistant. I can help you understand your data, write queries, and explain database concepts.";
  private systemPrompt: string;
  
  constructor(config: any = {}) {
    super(config);
    this.systemPrompt = config.systemPrompt || DEFAULT_CONFIG.systemPrompt;
  }
  
  getProviderName(): string {
    return 'MockAI';
  }
  
  async initialize(): Promise<boolean> {
    // Mock initialization - always succeeds
    return true;
  }
  
  async getAvailableModels(): Promise<IModel[]> {
    // Return mock models
    return [
      { id: 'mock-standard' },
      { id: 'mock-pro' }
    ];
  }
  
  getFallbackModels(): string[] {
    return ['mock-standard', 'mock-pro'];
  }
  
  formatModelName(modelId: string): string {
    if (modelId === 'mock-standard') {
      return 'MockAI Standard';
    } else if (modelId === 'mock-pro') {
      return 'MockAI Pro';
    }
    return modelId;
  }
  
  async sendMessage(message: string, conversationHistory: IConversationMessage[]): Promise<string> {
    // Add a small delay to simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check for exact matches in our response library
    if (this.responses[message]) {
      return this.responses[message];
    }
    
    // Check for keyword matches
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('sql') || lowerMessage.includes('query')) {
      return "That looks like a SQL query! I can help analyze and optimize SQL queries and explain database operations.";
    }
    
    if (lowerMessage.includes('table') || lowerMessage.includes('schema')) {
      return "Database tables and schemas are important for organizing your data. Let me know if you need help understanding your database structure.";
    }
    
    if (lowerMessage.includes('error') || lowerMessage.includes('bug')) {
      return "I can help troubleshoot database errors. Could you provide more details about the issue you're experiencing?";
    }
    
    // Generate a dynamic response based on conversation length
    let response = this.defaultResponse;
    response += `\n\nAs a database assistant, I can provide more detailed responses. Your conversation history has ${conversationHistory.length} messages.`;
    
    return response;
  }
  
  // Set a custom system prompt
  setSystemPrompt(prompt: string): Promise<boolean> {
    this.systemPrompt = prompt;
    return Promise.resolve(true);
  }
}