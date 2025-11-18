/**
 * Chat Session Storage Manager
 * Handles multi-session persistence in localStorage with dynamic title generation
 */

const ChatSessionStorage = {
  // Storage keys
  STORAGE_KEY: 'aiChatSessions',
  CURRENT_SESSION_KEY: 'aiChatCurrentSessionId',

  /**
   * Generate a UUID for session IDs
   * @returns {string} UUID
   */
  generateUUID() {
    return 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  },

  /**
   * Get all sessions from localStorage
   * @returns {Object} Sessions object { sessionId: sessionData, ... }
   */
  getAllSessions() {
    try {
      const sessions = localStorage.getItem(this.STORAGE_KEY);
      return sessions ? JSON.parse(sessions) : {};
    } catch (error) {
      console.error('Failed to get sessions:', error);
      return {};
    }
  },

  /**
   * Get a specific session by ID
   * @param {string} sessionId
   * @returns {Object|null} Session data or null
   */
  getSession(sessionId) {
    const sessions = this.getAllSessions();
    return sessions[sessionId] || null;
  },

  /**
   * Create a new session
   * @param {string} title - Initial title (optional, defaults to timestamp)
   * @returns {string} New session ID
   */
  createSession(title = null) {
    const sessionId = this.generateUUID();
    const now = Date.now();

    const session = {
      id: sessionId,
      title: title || `Chat ${new Date(now).toLocaleDateString()} ${new Date(now).toLocaleTimeString()}`,
      messages: [],
      createdAt: now,
      updatedAt: now,
      turnCount: 0
    };

    const sessions = this.getAllSessions();
    sessions[sessionId] = session;

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
      return sessionId;
    } catch (error) {
      console.error('Failed to create session:', error);
      return null;
    }
  },

  /**
   * Update an existing session
   * @param {string} sessionId
   * @param {Object} updates - Partial session data to update
   * @returns {boolean} Success status
   */
  updateSession(sessionId, updates) {
    const sessions = this.getAllSessions();

    if (!sessions[sessionId]) {
      console.error('Session not found:', sessionId);
      return false;
    }

    sessions[sessionId] = {
      ...sessions[sessionId],
      ...updates,
      updatedAt: Date.now()
    };

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
      return true;
    } catch (error) {
      console.error('Failed to update session:', error);
      return false;
    }
  },

  /**
   * Delete a session
   * @param {string} sessionId
   * @returns {boolean} Success status
   */
  deleteSession(sessionId) {
    const sessions = this.getAllSessions();

    if (!sessions[sessionId]) {
      console.error('Session not found:', sessionId);
      return false;
    }

    delete sessions[sessionId];

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));

      // If this was the current session, clear it
      const currentSessionId = this.getCurrentSessionId();
      if (currentSessionId === sessionId) {
        this.setCurrentSessionId(null);
      }

      return true;
    } catch (error) {
      console.error('Failed to delete session:', error);
      return false;
    }
  },

  /**
   * Get current active session ID
   * @returns {string|null}
   */
  getCurrentSessionId() {
    try {
      return localStorage.getItem(this.CURRENT_SESSION_KEY);
    } catch (error) {
      console.error('Failed to get current session ID:', error);
      return null;
    }
  },

  /**
   * Set current active session ID
   * @param {string|null} sessionId
   */
  setCurrentSessionId(sessionId) {
    try {
      if (sessionId) {
        localStorage.setItem(this.CURRENT_SESSION_KEY, sessionId);
      } else {
        localStorage.removeItem(this.CURRENT_SESSION_KEY);
      }
    } catch (error) {
      console.error('Failed to set current session ID:', error);
    }
  },

  /**
   * Get sessions sorted by most recent first
   * @returns {Array} Array of session objects sorted by updatedAt
   */
  getSessionsSorted() {
    const sessions = this.getAllSessions();
    return Object.values(sessions).sort((a, b) => b.updatedAt - a.updatedAt);
  },

  /**
   * Add a message to a session
   * @param {string} sessionId
   * @param {Object} message - { role, content, timestamp }
   * @returns {boolean} Success status
   */
  addMessage(sessionId, message) {
    const session = this.getSession(sessionId);
    if (!session) {
      console.error('Session not found:', sessionId);
      return false;
    }

    session.messages.push(message);

    // Increment turn count if this is an assistant message
    if (message.role === 'assistant') {
      session.turnCount++;
    }

    return this.updateSession(sessionId, {
      messages: session.messages,
      turnCount: session.turnCount
    });
  },

  /**
   * Remove the last two messages from a session (for cancel operation)
   * @param {string} sessionId
   * @returns {boolean} Success status
   */
  removeLastMessages(sessionId) {
    const session = this.getSession(sessionId);
    if (!session || session.messages.length < 2) {
      return false;
    }

    // Remove last 2 messages (user + assistant)
    session.messages.splice(-2, 2);

    // Decrement turn count
    if (session.turnCount > 0) {
      session.turnCount--;
    }

    return this.updateSession(sessionId, {
      messages: session.messages,
      turnCount: session.turnCount
    });
  },

  /**
   * Generate a dynamic title for a session using Prompt API
   * @param {string} sessionId
   * @returns {Promise<string|null>} Generated title or null on error
   */
  async generateSessionTitle(sessionId) {
    const session = this.getSession(sessionId);
    if (!session || session.messages.length === 0) {
      return null;
    }

    try {
      // Check if LanguageModel API is available
      if (!window.LanguageModel) {
        console.error('LanguageModel API not available');
        return null;
      }

      // Build conversation snippet (last 4 messages for context)
      const recentMessages = session.messages.slice(-4);
      const conversationText = recentMessages
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n');

      // Create a temporary session for title generation
      const titleSession = await window.LanguageModel.create({
        initialPrompts: [
          {
            role: 'system',
            content: 'You generate short, descriptive titles for conversations. Keep titles under 5 words. Be specific and relevant.'
          }
        ]
      });

      // Generate title
      const prompt = `Based on this conversation, generate a short 3-5 word title (no quotes, no punctuation at end):\n\n${conversationText}`;
      const titleResponse = await titleSession.prompt(prompt);

      // Clean up the title (remove quotes, extra punctuation)
      const cleanTitle = titleResponse
        .replace(/^["']|["']$/g, '')  // Remove surrounding quotes
        .replace(/[.!?]+$/, '')         // Remove ending punctuation
        .trim()
        .slice(0, 50);                  // Max 50 characters

      // Destroy the temporary session
      titleSession.destroy();

      return cleanTitle || null;

    } catch (error) {
      console.error('Failed to generate session title:', error);
      return null;
    }
  },

  /**
   * Update session title dynamically
   * @param {string} sessionId
   * @returns {Promise<boolean>} Success status
   */
  async updateSessionTitle(sessionId) {
    const newTitle = await this.generateSessionTitle(sessionId);

    if (newTitle) {
      return this.updateSession(sessionId, { title: newTitle });
    }

    return false;
  },

  /**
   * Check if a session needs title update (after every 2 turns)
   * @param {string} sessionId
   * @returns {boolean}
   */
  needsTitleUpdate(sessionId) {
    const session = this.getSession(sessionId);
    if (!session) return false;

    // Update title after every 2 turns (turns 2, 4, 6, etc.)
    // and only if turn count is divisible by 2 and > 0
    return session.turnCount > 0 && session.turnCount % 2 === 0;
  },

  /**
   * Clear all sessions (for debugging)
   */
  clearAllSessions() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.CURRENT_SESSION_KEY);
      return true;
    } catch (error) {
      console.error('Failed to clear sessions:', error);
      return false;
    }
  }
};

// Export for use in other modules
window.ChatSessionStorage = ChatSessionStorage;
