/**
 * Chat Handler
 * Handles message sending, receiving, and UI updates
 */

const ChatHandler = {
  // DOM elements
  elements: {
    messagesContainer: null,
    chatForm: null,
    chatInput: null,
    sendButton: null,
    clearButton: null,
    closeButton: null,
    statusIndicator: null,
    statusText: null,
    charCounter: null
  },

  // Message counter for unique IDs
  messageCounter: 0,

  /**
   * Initialize the chat handler
   */
  init() {
    // Get DOM elements
    this.elements.messagesContainer = document.getElementById('chat-messages');
    this.elements.chatForm = document.getElementById('chat-form');
    this.elements.chatInput = document.getElementById('chat-input');
    this.elements.sendButton = document.getElementById('send-message-btn');
    this.elements.clearButton = document.getElementById('clear-chat-btn');
    this.elements.closeButton = document.getElementById('close-chat-btn');
    this.elements.statusIndicator = document.getElementById('chat-status');
    this.elements.statusText = document.getElementById('chat-status-text');
    this.elements.charCounter = document.getElementById('char-counter');

    // Setup event listeners
    this.setupEventListeners();

    // Restore previous conversation if exists
    this.restoreMessages();
  },

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Form submission
    this.elements.chatForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSendMessage();
    });

    // Auto-resize textarea
    this.elements.chatInput?.addEventListener('input', (e) => {
      this.autoResizeTextarea(e.target);
      this.updateCharCounter();
    });

    // Clear conversation
    this.elements.clearButton?.addEventListener('click', () => {
      this.clearConversation();
    });

    // Close chat from header wand icon
    document.getElementById('chat-header-close')?.addEventListener('click', () => {
      window.ChatUI?.closeChat();
    });

    // Close chat (mobile fallback)
    this.elements.closeButton?.addEventListener('click', () => {
      window.ChatUI?.closeChat();
    });

    // Enter key to send (Shift+Enter for new line)
    this.elements.chatInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSendMessage();
      }
    });
  },

  /**
   * Handle sending a message
   */
  async handleSendMessage() {
    const message = this.elements.chatInput.value.trim();

    if (!message || !window.ChatSessionManager) {
      return;
    }

    // Check if session is initialized
    if (!window.ChatSessionManager.isInitialized) {
      this.showStatus('Initializing AI session...', 'info');

      const initialized = await window.ChatSessionManager.initialize();
      if (!initialized) {
        this.showError('Failed to initialize AI session. Please try again.');
        return;
      }

      this.hideStatus();
    }

    // Disable input while processing
    this.setInputEnabled(false);
    this.showStatus('AI is thinking...');

    // Clear input
    this.elements.chatInput.value = '';
    this.updateCharCounter();
    this.autoResizeTextarea(this.elements.chatInput);

    // Add user message to UI
    this.addMessageToUI('user', message);

    // Create placeholder for assistant response
    const assistantMsgId = this.addMessageToUI('assistant', '');
    let fullResponse = '';

    // Send message and handle streaming response
    await window.ChatSessionManager.sendMessage(
      message,
      // onChunk - update UI with each chunk
      (chunk, accumulated) => {
        fullResponse = accumulated;
        this.updateMessage(assistantMsgId, fullResponse);
      },
      // onComplete
      () => {
        this.hideStatus();
        this.setInputEnabled(true);
        this.elements.chatInput.focus();
      },
      // onError
      (error) => {
        console.error('Error sending message:', error);
        this.showError('Failed to send message. Please try again.');
        this.setInputEnabled(true);
        this.removeMessage(assistantMsgId);
      }
    );
  },

  /**
   * Add a message to the UI
   * @param {string} role - 'user' or 'assistant'
   * @param {string} content - Message content
   * @returns {string} Message element ID
   */
  addMessageToUI(role, content) {
    const messageId = `msg-${this.messageCounter++}`;

    const messageEl = document.createElement('div');
    messageEl.id = messageId;
    messageEl.className = `message ${role}-message flex items-start gap-3`;

    if (role === 'user') {
      messageEl.classList.add('flex-row-reverse');
    }

    // Avatar
    const avatarEl = document.createElement('div');
    avatarEl.className = `message-avatar flex-shrink-0 w-8 h-8 rounded-full ${
      role === 'user'
        ? 'bg-primary/80 dark:bg-darkmode-primary/80'
        : 'bg-primary dark:bg-darkmode-primary'
    } flex items-center justify-center`;

    const avatarIcon = role === 'user'
      ? '<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>'
      : '<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>';

    avatarEl.innerHTML = avatarIcon;

    // Content
    const contentEl = document.createElement('div');
    contentEl.className = 'message-content flex-1';

    const bubbleEl = document.createElement('div');
    bubbleEl.className = `message-bubble ${
      role === 'user'
        ? 'bg-primary dark:bg-darkmode-primary'
        : 'bg-light dark:bg-darkmode-light'
    } rounded-lg px-4 py-3`;

    const textEl = document.createElement('div');
    textEl.className = 'prose prose-sm dark:prose-invert max-w-none';

    if (content) {
      if (role === 'assistant') {
        // Render markdown for assistant messages
        textEl.innerHTML = window.marked ? window.marked.parse(content) : content;
      } else {
        // Plain text for user messages
        textEl.innerHTML = `<p class="${
          role === 'user' ? 'text-white' : 'text-text dark:text-darkmode-text'
        }">${this.escapeHtml(content)}</p>`;
      }
    } else if (role === 'assistant') {
      // Show typing indicator for empty assistant message
      textEl.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
    }

    bubbleEl.appendChild(textEl);
    contentEl.appendChild(bubbleEl);

    messageEl.appendChild(avatarEl);
    messageEl.appendChild(contentEl);

    this.elements.messagesContainer.appendChild(messageEl);
    this.scrollToBottom();

    return messageId;
  },

  /**
   * Update message content
   * @param {string} messageId
   * @param {string} content
   */
  updateMessage(messageId, content) {
    const messageEl = document.getElementById(messageId);
    if (!messageEl) return;

    const textEl = messageEl.querySelector('.prose');
    if (!textEl) return;

    // Render markdown
    textEl.innerHTML = window.marked ? window.marked.parse(content) : content;

    this.scrollToBottom();
  },

  /**
   * Remove a message
   * @param {string} messageId
   */
  removeMessage(messageId) {
    const messageEl = document.getElementById(messageId);
    if (messageEl) {
      messageEl.remove();
    }
  },

  /**
   * Restore messages from session manager
   */
  restoreMessages() {
    if (!window.ChatSessionManager) return;

    const messages = window.ChatSessionManager.getMessages();

    // Clear current messages (keep empty state)
    const existingMessages = this.elements.messagesContainer.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());

    // Add restored messages
    messages.forEach(msg => {
      if (msg.role === 'user' || msg.role === 'assistant') {
        this.addMessageToUI(msg.role, msg.content);
      }
    });
  },

  /**
   * Clear conversation
   */
  clearConversation() {
    // Clear from session manager
    window.ChatSessionManager?.clearConversation();

    // Clear UI (empty state will show automatically)
    const messages = this.elements.messagesContainer.querySelectorAll('.message');
    messages.forEach(msg => msg.remove());
  },

  /**
   * Show status message
   * @param {string} message
   * @param {string} type - 'info', 'error', 'success'
   */
  showStatus(message, type = 'info') {
    if (!this.elements.statusIndicator || !this.elements.statusText) return;

    this.elements.statusText.textContent = message;
    this.elements.statusIndicator.classList.remove('hidden');

    if (type === 'error') {
      this.elements.statusIndicator.classList.add('chat-error');
    } else if (type === 'success') {
      this.elements.statusIndicator.classList.add('chat-success');
    } else {
      this.elements.statusIndicator.classList.add('chat-info');
    }
  },

  /**
   * Hide status message
   */
  hideStatus() {
    if (!this.elements.statusIndicator) return;

    this.elements.statusIndicator.classList.add('hidden');
    this.elements.statusIndicator.classList.remove('chat-error', 'chat-success', 'chat-info');
  },

  /**
   * Show error message
   * @param {string} message
   */
  showError(message) {
    this.showStatus(message, 'error');

    setTimeout(() => {
      this.hideStatus();
    }, 5000);
  },

  /**
   * Enable/disable input
   * @param {boolean} enabled
   */
  setInputEnabled(enabled) {
    if (this.elements.chatInput) {
      this.elements.chatInput.disabled = !enabled;
    }
    if (this.elements.sendButton) {
      this.elements.sendButton.disabled = !enabled;
    }
  },

  /**
   * Auto-resize textarea (up to 5 lines ~120px)
   * @param {HTMLTextAreaElement} textarea
   */
  autoResizeTextarea(textarea) {
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  },

  /**
   * Update character counter
   */
  updateCharCounter() {
    if (!this.elements.charCounter || !this.elements.chatInput) return;

    const count = this.elements.chatInput.value.length;
    this.elements.charCounter.textContent = count;

    // Warn when approaching limit
    if (count > 1800) {
      this.elements.charCounter.classList.add('text-red-500');
    } else {
      this.elements.charCounter.classList.remove('text-red-500');
    }
  },

  /**
   * Scroll to bottom of messages
   */
  scrollToBottom() {
    if (!this.elements.messagesContainer) return;

    this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
  },

  /**
   * Escape HTML to prevent XSS
   * @param {string} text
   * @returns {string}
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Export for use in other modules
window.ChatHandler = ChatHandler;
