<template>
  <div class="assistant-app">
    <!-- API Key Form -->
    <ApiKeyForm 
      v-if="!apiKey" 
      @api-key-submitted="setApiKey" 
    />

    <!-- Chat Interface -->
    <ChatInterface 
      v-else 
      :api-key="apiKey"
      :initial-provider="selectedProvider"
      :initial-model="selectedModel"
    />
  </div>
</template>

<script>
import ApiKeyForm from './components/ApiKeyForm.vue';
import ChatInterface from './components/ChatInterface.vue';
import * as storage from './store';

export default {
  components: {
    ApiKeyForm,
    ChatInterface
  },
  
  data() {
    return {
      apiKey: '',
      selectedModel: 'claude-3-5-sonnet-20240620', // Default value until async load completes
      selectedProvider: 'claude' // Default value until async load completes
    };
  },
  
  async mounted() {
    try {
      // Load settings from storage asynchronously
      const [storedApiKey, model, provider] = await Promise.all([
        storage.getApiKey(),
        storage.getSelectedModel(),
        storage.getSelectedProvider()
      ]);
      
      // Update the component state with stored values
      if (storedApiKey) {
        this.apiKey = storedApiKey;
      }
      
      this.selectedModel = model;
      this.selectedProvider = provider;
    } catch (error) {
      console.error('Error loading stored settings:', error);
    }
  },
  
  methods: {
    async setApiKey(key) {
      this.apiKey = key;
      try {
        await storage.saveApiKey(key);
      } catch (error) {
        console.error('Error saving API key:', error);
      }
    }
  }
};
</script>

<style>
@import '../style.css';
</style>
