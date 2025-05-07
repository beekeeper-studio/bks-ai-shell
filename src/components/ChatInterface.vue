<template>
  <div class="chat-container">
    <header>
      <h1>AI Assistant</h1>
      <div class="selector-container">
        <div class="provider-selector-container">
          <label for="provider-selector">Provider:</label>
          <select id="provider-selector" v-model="selectedProvider" @change="handleProviderChange">
            <option v-for="provider in availableProviders" :key="provider.value" :value="provider.value">
              {{ provider.label }}
            </option>
          </select>
        </div>
        <div class="model-selector-container">
          <label for="model-selector">Model:</label>
          <select id="model-selector" v-model="selectedModel" @change="handleModelChange">
            <option v-for="model in availableModels" :key="model.value" :value="model.value">
              {{ model.label }}
            </option>
          </select>
        </div>
      </div>
    </header>
    
    <div class="chat-messages" ref="chatMessagesRef">
      <div v-for="(message, index) in messages" :key="index" :class="['message', message.role]">
        <div class="message-content">
          {{ message.content }}
        </div>
      </div>
      <div v-if="isThinking" class="thinking">
        <div v-for="i in 3" :key="i" class="thinking-dot"></div>
      </div>
    </div>
    
    <div class="chat-input-container">
      <textarea 
        v-model="userInput"
        @keydown.enter.prevent="handleEnterKey"
        placeholder="Type your message here..." 
        rows="3"
        :disabled="isThinking"
      ></textarea>
      <button @click="sendMessage" :disabled="isThinking || !userInput.trim()">
        <span>Send</span>
      </button>
    </div>
  </div>
</template>

<script>
import * as api from '../api';
import * as storage from '../store';

export default {
  name: 'ChatInterface',
  
  props: {
    apiKey: {
      type: String,
      required: true
    },
    initialProvider: {
      type: String,
      default: 'claude'
    },
    initialModel: {
      type: String,
      default: ''
    }
  },
  
  data() {
    return {
      selectedProvider: this.initialProvider,
      selectedModel: this.initialModel,
      userInput: '',
      isThinking: false,
      messages: [{
        role: 'system',
        content: "Hi there! I'm your Claude-powered assistant using LangChain. How can I help you today?"
      }],
      conversationHistory: [],
      availableProviders: [],
      availableModels: [{ value: 'loading', label: 'Loading models...' }]
    };
  },
  
  watch: {
    messages: {
      handler() {
        this.$nextTick(() => {
          if (this.$refs.chatMessagesRef) {
            this.$refs.chatMessagesRef.scrollTop = this.$refs.chatMessagesRef.scrollHeight;
          }
        });
      },
      deep: true
    }
  },
  
  async mounted() {
    // Set up available providers
    const providers = api.getAvailableProviders();
    this.availableProviders = providers.map(provider => {
      let label = provider;
      if (provider === 'claude') label = 'Claude';
      if (provider === 'mock') label = 'MockAI (Demo)';
      return { value: provider, label };
    });

    // Initialize provider
    await this.initializeProvider();
  },
  
  methods: {
    // Initialize provider and load models
    async initializeProvider() {
      // Initialize with config
      const result = await api.initializeProvider({
        apiKey: this.apiKey,
        modelName: this.selectedModel
      });
      
      if (result.success) {
        // Load models for this provider
        await this.loadModelsForProvider();
      } else {
        this.addMessage('system', `Error initializing ${this.selectedProvider}: ${result.error}`);
      }
    },
    
    // Load models for current provider
    async loadModelsForProvider() {
      // Show loading status
      this.availableModels = [{ value: 'loading', label: 'Loading models...' }];
      
      // Try to fetch available models
      const modelsResult = await api.fetchAvailableModels();
      
      if (modelsResult.success) {
        // Populate models
        this.availableModels = modelsResult.models.map(model => {
          const formattedName = api.formatModelName(model.id);
          return { value: model.id, label: formattedName };
        });
      } else {
        // Use fallback models
        this.availableModels = (modelsResult.fallbackModels || []).map(modelId => {
          const formattedName = api.formatModelName(modelId);
          return { value: modelId, label: formattedName };
        });
        
        if (modelsResult.error) {
          this.addMessage('system', `Note: Using default models. ${modelsResult.error}`);
        }
      }
    },
    
    // Handle provider change
    async handleProviderChange() {
      try {
        await storage.saveSelectedProvider(this.selectedProvider);
        
        // Clear conversation when switching providers
        this.conversationHistory = [];
        
        // Switch provider
        const result = await api.switchProvider(this.selectedProvider, {
          apiKey: this.apiKey,
          modelName: null // Let provider choose default initially
        });
        
        if (result.success) {
          this.addMessage('system', `Switched to ${result.provider} provider`);
          await this.loadModelsForProvider();
        } else {
          this.addMessage('system', `Error switching provider: ${result.error}`);
        }
      } catch (error) {
        console.error('Error handling provider change:', error);
        this.addMessage('system', `Error saving provider preference: ${error.message}`);
      }
    },
    
    // Handle model change
    async handleModelChange() {
      // Skip if "loading" is selected
      if (this.selectedModel === 'loading') return;
      
      try {
        await storage.saveSelectedModel(this.selectedModel);
        api.setModel(this.selectedModel);
        
        // Re-initialize the chain
        await api.initializeProvider({
          apiKey: this.apiKey,
          modelName: this.selectedModel
        });
        
        this.addMessage('system', `Model switched to ${api.formatModelName(this.selectedModel)}`);
      } catch (error) {
        console.error('Error handling model change:', error);
        this.addMessage('system', `Error saving model preference: ${error.message}`);
      }
    },
    
    // Add message to UI and scroll to bottom
    addMessage(role, content) {
      this.messages.push({ role, content });
    },
    
    // Handle enter key (send on Enter, new line on Shift+Enter)
    handleEnterKey(e) {
      if (!e.shiftKey && !this.isThinking) {
        e.preventDefault();
        e.stopPropagation();
        this.sendMessage();
      }
    },
    
    // Send message
    async sendMessage() {
      const message = this.userInput.trim();
      
      // Don't send empty messages
      if (!message || this.isThinking) return;
      
      // Add the user message to the UI
      this.addMessage('user', message);
      
      // Clear the input field
      this.userInput = '';
      
      // Add user message to conversation history
      this.conversationHistory.push({ type: "human", content: message });
      
      // Show thinking state
      this.isThinking = true;
      
      try {
        console.log('Sending message to API:', message);
        console.log('Conversation history:', this.conversationHistory);
        
        // Call the API using the current provider
        const result = await api.sendMessage(message, this.conversationHistory);
        console.log('API response:', result);
        
        // Process the response
        if (result.success) {
          // Add the assistant message to the UI
          this.addMessage('assistant', result.content);
          console.log('Assistant response added to UI');
          
          // Add assistant response to conversation history
          this.conversationHistory.push({ type: "ai", content: result.content });
          console.log('Conversation history updated');
        } else {
          // Handle error
          const errorMessage = `Error: ${result.error || 'Unknown error occurred'}`;
          this.addMessage('system', errorMessage);
          console.error('API error:', result.error);
        }
      } catch (error) {
        console.error('Error communicating with API:', error);
        this.addMessage('system', `Error: ${error.message || 'Failed to communicate with the API'}`);
      } finally {
        // Clear thinking state
        this.isThinking = false;
        console.log('Thinking state cleared');
      }
    }
  }
};
</script>
