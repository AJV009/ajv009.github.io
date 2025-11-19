/**
 * Chat Session Manager
 * Manages the active Prompt API session lifecycle and conversation state
 */

const ChatSessionManager = {
  // Session instance
  session: null,

  // Current session ID (from ChatSessionStorage)
  currentSessionId: null,

  // Conversation history (in-memory cache, synced with storage)
  messages: [],

  // Session state
  isInitialized: false,
  isProcessing: false,
  shouldStopStreaming: false,

  /**
   * Initialize the chat session
   * @param {string|null} sessionId - Optional session ID to load
   * @returns {Promise<boolean>} Success status
   */
  async initialize(sessionId = null) {
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

      // Determine which session to load
      let targetSessionId = sessionId;

      if (!targetSessionId) {
        // Try to get current session from storage
        targetSessionId = window.ChatSessionStorage?.getCurrentSessionId();
      }

      // If no session exists, create a new one
      if (!targetSessionId || !window.ChatSessionStorage?.getSession(targetSessionId)) {
        if (window.ChatSessionStorage) {
          targetSessionId = window.ChatSessionStorage.createSession();
          window.ChatSessionStorage.setCurrentSessionId(targetSessionId);
        } else {
          console.error('ChatSessionStorage not available');
          return false;
        }
      }

      this.currentSessionId = targetSessionId;

      // Load messages from storage
      const sessionData = window.ChatSessionStorage.getSession(targetSessionId);
      const savedMessages = sessionData ? sessionData.messages : [];

      // Build initialPrompts array with system prompt + previous messages
      const initialPrompts = [
        {
          role: 'system',
          content: `You are Daisy, a helpful AI assistant for Alphons' personal website.

You help visitors understand content on the site, answer questions about blog posts, projects, and other site content.

When provided with page context (visible content from the current page), use it to give accurate, relevant answers based on what the user is viewing. Always be friendly, concise, and helpful.

Format responses using markdown when appropriate.`
        }
      ];

      // Add previous messages to initialPrompts if they exist (for session restoration)
      if (savedMessages && savedMessages.length > 0) {
        savedMessages.forEach(msg => {
          if (msg.role === 'user' || msg.role === 'assistant') {
            initialPrompts.push({
              role: msg.role,
              content: msg.content
            });
          }
        });
      }

      // Store messages in memory
      this.messages = savedMessages;

      // Create session with initial prompts (system + previous conversation)
      this.session = await window.LanguageModel.create({
        initialPrompts: initialPrompts
      });

      this.isInitialized = true;
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
   * @param {string|null} pageContext - Optional page context to enhance the prompt
   */
  async sendMessage(userMessage, onChunk, onComplete, onError, pageContext = null) {
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
      const userMsg = {
        role: 'user',
        content: userMessage,
        timestamp: Date.now()
      };
      this.messages.push(userMsg);

      // Save user message to storage
      if (this.currentSessionId && window.ChatSessionStorage) {
        window.ChatSessionStorage.addMessage(this.currentSessionId, userMsg);
      }

      // Build enhanced prompt with page context if provided
      let promptToSend = userMessage;
      if (pageContext) {
        promptToSend = `${pageContext}\n${userMessage}`;
      }

      // Stream the response - pass enhanced prompt with context
      // The session maintains conversation context internally!
      const stream = this.session.promptStreaming(promptToSend);
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
      const assistantMsg = {
        role: 'assistant',
        content: fullResponse,
        timestamp: Date.now()
      };
      this.messages.push(assistantMsg);

      // Save assistant message to storage
      if (this.currentSessionId && window.ChatSessionStorage) {
        window.ChatSessionStorage.addMessage(this.currentSessionId, assistantMsg);

        // Check if title needs update (after every 2 turns)
        if (window.ChatSessionStorage.needsTitleUpdate(this.currentSessionId)) {
          // Trigger title update asynchronously (don't wait for it)
          window.ChatSessionStorage.updateSessionTitle(this.currentSessionId)
            .catch(error => console.error('Failed to update session title:', error));
        }
      }

      onComplete?.(fullResponse);

    } catch (error) {
      console.error('Error sending message:', error);
      onError?.(error);
    } finally {
      this.isProcessing = false;
    }
  },

  /**
   * Clear current conversation (creates a new session)
   */
  clearConversation() {
    // Destroy current Prompt API session
    if (this.session) {
      try {
        this.session.destroy();
      } catch (error) {
        console.error('Error destroying session:', error);
      }
    }

    // Clear in-memory messages
    this.messages = [];

    // Create a new session in storage
    if (window.ChatSessionStorage) {
      const newSessionId = window.ChatSessionStorage.createSession();
      window.ChatSessionStorage.setCurrentSessionId(newSessionId);
      this.currentSessionId = newSessionId;
    }

    // Reset state
    this.session = null;
    this.isInitialized = false;
  },

  /**
   * Switch to a different session
   * @param {string} sessionId - Session ID to load
   * @returns {Promise<boolean>} Success status
   */
  async switchSession(sessionId) {
    // Destroy current session
    this.destroy();

    // Initialize with new session ID
    return await this.initialize(sessionId);
  },

  /**
   * Delete current session and switch to a new one
   */
  async deleteCurrentSession() {
    if (!this.currentSessionId) return;

    // Delete from storage
    if (window.ChatSessionStorage) {
      window.ChatSessionStorage.deleteSession(this.currentSessionId);
    }

    // Clear and create new session
    this.clearConversation();
  },

  /**
   * Remove last messages from current session (for cancel operation)
   */
  removeLastMessages() {
    if (!this.currentSessionId || !window.ChatSessionStorage) return;

    // Remove from storage
    window.ChatSessionStorage.removeLastMessages(this.currentSessionId);

    // Remove from in-memory cache
    if (this.messages.length >= 2) {
      this.messages.splice(-2, 2);
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
