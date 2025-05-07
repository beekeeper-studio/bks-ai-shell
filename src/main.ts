import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

/**
 * Main entry point for the Beekeeper Studio chatbot plugin
 */

// Create and mount the Vue app
const app = createApp(App)
app.mount('#app')

/**
 * Communication handler for the plugin system
 */
class PluginCommunicationHandler {
  /**
   * Send a message to the parent window
   */
  static sendToParent(type: string, data: any): void {
    window.parent.postMessage({ type, data }, '*')
  }
  
  /**
   * Initialize the communication channel
   */
  static init(): void {
    // Set up message listener
    window.addEventListener('message', (event) => {
      const { type, data } = event.data || {}
      
      // Handle incoming messages from parent
      switch (type) {
        case 'INIT_PLUGIN':
          console.log('Plugin initialized with data:', data)
          // You can store this data in your Vue app state if needed
          break
          
        case 'API_RESPONSE':
          // Handle API responses
          // Example: store.dispatch('handleApiResponse', data)
          break
          
        case 'DATABASE_CHANGED':
          // Handle database change notifications
          console.log('Database changed:', data)
          // Could trigger a refresh of schema info
          break
          
        // Add other message types as needed
      }
    })
    
    // Notify parent that plugin is ready
    this.sendToParent('PLUGIN_READY', {})
  }
}

// Expose message handler to window for debugging (development only)
if (process.env.NODE_ENV !== 'production') {
  (window as any).pluginMessenger = PluginCommunicationHandler
}

// Initialize communication
PluginCommunicationHandler.init()