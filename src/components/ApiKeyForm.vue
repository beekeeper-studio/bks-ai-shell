<template>
  <div class="api-key-container">
    <div class="api-key-form-wrapper">
      <h1>Claude AI Assistant with LangChain</h1>
      <p>Enter your Claude API key to start chatting:</p>
      <form class="api-key-form" @submit.prevent="submitApiKey">
        <input 
          type="password" 
          v-model="apiKey" 
          placeholder="Enter your Claude API key" 
          required
        />
        <button type="submit">Start Chatting</button>
      </form>
      <div class="api-info">
        <p>Your API key is stored locally in your browser and is never sent to any server except Claude's API.</p>
        <p>Need a Claude API key? <a href="https://console.anthropic.com/keys" target="_blank" rel="noopener noreferrer">Get one here</a>.</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ApiKeyForm',
  
  data() {
    return {
      apiKey: ''
    };
  },
  
  methods: {
    submitApiKey() {
      if (this.apiKey.trim()) {
        this.$emit('api-key-submitted', this.apiKey.trim());
      }
    }
  }
};
</script>
