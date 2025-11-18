/**
 * Chat Session Manager
 * Manages the Prompt API session lifecycle and conversation state
 */

const ChatSessionManager = {
  // Session instance
  session: null,

  // Conversation history
  messages: [],

  // Session state
  isInitialized: false,
  isProcessing: false,
  shouldStopStreaming: false,

  /**
   * Initialize the chat session
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    if (this.isInitialized && this.session) {
      return true;
    }

    try {
      // Check if LanguageModel API is available
      if (!window.LanguageModel) {
        console.error('LanguageModel API not available');
        return false;
      }

      // Check availability
      const availability = await window.LanguageModel.availability();
      if (availability === 'unavailable') {
        console.error('Language model unavailable on this device');
        return false;
      }

      // Create session with initial system prompt
      this.session = await window.LanguageModel.create({
        initialPrompts: [
          {
            role: 'system',
            content: `You are a helpful AI assistant integrated into a personal portfolio website.
You can help visitors learn more about the site owner, answer questions, and have friendly conversations.
Be concise, helpful, and engaging. Format responses using markdown when appropriate.`
          }
        ]
      });

      this.isInitialized = true;

      // Try to restore previous conversation from sessionStorage
      this.restoreConversation();

      return true;

    } catch (error) {
      console.error('Failed to initialize chat session:', error);
      this.isInitialized = false;
      return false;
    }
  },

  /**
   * Send a message and get streaming response
   * @param {string} userMessage - The user's message
   * @param {Function} onChunk - Callback for each response chunk
   * @param {Function} onComplete - Callback when response is complete
   * @param {Function} onError - Callback for errors
   */
  async sendMessage(userMessage, onChunk, onComplete, onError) {
    if (!this.isInitialized || !this.session) {
      onError?.(new Error('Session not initialized'));
      return;
    }

    if (this.isProcessing) {
      onError?.(new Error('Already processing a message'));
      return;
    }

    this.isProcessing = true;
    this.shouldStopStreaming = false;

    try {
      // Add user message to history
      this.messages.push({
        role: 'user',
        content: userMessage,
        timestamp: Date.now()
      });

      // Build conversation context
      const conversationContext = this.buildConversationContext();
      const prompt = `${conversationContext}\n\nUser: ${userMessage}`;

      // Stream the response
      const stream = this.session.promptStreaming(prompt);
      let fullResponse = '';

      for await (const chunk of stream) {
        // Check if streaming should be stopped
        if (this.shouldStopStreaming) {
          break;
        }

        fullResponse += chunk;
        onChunk?.(chunk, fullResponse);
      }

      // Add assistant response to history
      this.messages.push({
        role: 'assistant',
        content: fullResponse,
        timestamp: Date.now()
      });

      // Save conversation to sessionStorage
      this.saveConversation();

      onComplete?.(fullResponse);

    } catch (error) {
      console.error('Error sending message:', error);
      onError?.(error);
    } finally {
      this.isProcessing = false;
    }
  },

  /**
   * Build conversation context string from message history
   * @returns {string}
   */
  buildConversationContext() {
    if (this.messages.length === 0) {
      return '';
    }

    // Include last 10 messages for context (to avoid token limits)
    const recentMessages = this.messages.slice(-10);

    return recentMessages.map(msg => {
      if (msg.role === 'user') {
        return `User: ${msg.content}`;
      } else if (msg.role === 'assistant') {
        return `Assistant: ${msg.content}`;
      }
      return '';
    }).join('\n\n');
  },

  /**
   * Clear conversation history
   */
  clearConversation() {
    this.messages = [];
    sessionStorage.removeItem('aiChatHistory');
  },

  /**
   * Save conversation to sessionStorage
   */
  saveConversation() {
    try {
      sessionStorage.setItem('aiChatHistory', JSON.stringify(this.messages));
    } catch (error) {
      console.error('Failed to save conversation:', error);
    }
  },

  /**
   * Restore conversation from sessionStorage
   */
  restoreConversation() {
    try {
      const saved = sessionStorage.getItem('aiChatHistory');
      if (saved) {
        this.messages = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to restore conversation:', error);
    }
  },

  /**
   * Get conversation history
   * @returns {Array}
   */
  getMessages() {
    return [...this.messages];
  },

  /**
   * Stop the current streaming response
   */
  stopCurrentResponse() {
    this.shouldStopStreaming = true;
    this.isProcessing = false;
  },

  /**
   * Destroy the session and free resources
   */
  destroy() {
    if (this.session) {
      try {
        this.session.destroy();
      } catch (error) {
        console.error('Error destroying session:', error);
      }
    }

    this.session = null;
    this.isInitialized = false;
    this.isProcessing = false;
  }
};

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  ChatSessionManager.destroy();
});

// Export for use in other modules
window.ChatSessionManager = ChatSessionManager;
