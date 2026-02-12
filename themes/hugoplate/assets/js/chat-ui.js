/**
 * Chat UI Manager
 * Manages the overall chat UI state and interactions
 */

const ChatUI = {
  // DOM elements
  elements: {
    chatPanel: null,
    toggleButton: null,
    layoutWrapper: null,
    footer: null
  },

  // State
  isOpen: false,
  isAvailable: false,
  footerObserver: null,
  viewState: 'session-list', // 'session-list' or 'chat-active'

  /**
   * Initialize the chat UI
   */
  async init() {
    // Get DOM elements
    this.elements.chatPanel = document.getElementById('ai-chat-panel');
    this.elements.toggleButton = document.getElementById('ai-chat-toggle');
    this.elements.layoutWrapper = document.getElementById('chat-layout-wrapper');
    this.elements.footer = document.querySelector('footer');

    // Check if chat should be enabled
    const { enabled, available, status, message, orientationRestricted } =
      await window.PromptAPIDetector.shouldEnableChat();

    this.isAvailable = available;

    if (!enabled) {
      // Button is always visible — attach click handler to show toast on unsupported browsers
      this.elements.toggleButton?.addEventListener('click', () => {
        this.showUnsupportedToast();
      });
      return;
    }

    // Calculate and set header height
    this.setHeaderHeight();

    // Setup event listeners
    this.setupEventListeners();

    // Setup footer observer for dynamic height adjustment
    this.setupFooterObserver();

    // Restore previous state
    this.restoreState();
  },

  /**
   * Calculate header height and set CSS variable
   */
  setHeaderHeight() {
    const header = document.querySelector('.header');
    if (header) {
      const headerHeight = header.offsetHeight;
      document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
    }
  },

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Toggle button click
    this.elements.toggleButton?.addEventListener('click', () => {
      this.toggleChat();
    });

    // Listen for orientation changes
    window.PromptAPIDetector?.onOrientationChange((isLandscape) => {
      if (!isLandscape) {
        this.closeChat();
      }
    });
  },

  /**
   * Show toast for unsupported browsers
   */
  showUnsupportedToast() {
    // Prevent stacking toasts
    if (document.querySelector('.ai-unsupported-toast')) return;

    const toast = document.createElement('div');
    toast.className = 'ai-unsupported-toast';
    toast.innerHTML = `
      <div class="ai-toast-content">
        <i class="fa-solid fa-circle-exclamation"></i>
        <div>
          <strong>AI Assistant unavailable</strong>
          <p>Your browser doesn't support the Chrome built-in AI APIs.
            <a href="https://developer.chrome.com/docs/ai/get-started#requirements"
               target="_blank" rel="noopener noreferrer">Check requirements &rarr;</a>
          </p>
        </div>
        <button class="ai-toast-close" aria-label="Close">&times;</button>
      </div>
    `;

    document.body.appendChild(toast);

    // Trigger reflow then animate in
    toast.offsetWidth;
    toast.classList.add('ai-toast-visible');

    const dismiss = () => {
      toast.classList.remove('ai-toast-visible');
      setTimeout(() => toast.remove(), 300);
    };

    toast.querySelector('.ai-toast-close').addEventListener('click', dismiss);
    setTimeout(dismiss, 6000);
  },

  /**
   * Toggle chat open/closed
   */
  toggleChat() {
    if (this.isOpen) {
      this.closeChat();
    } else {
      this.openChat();
    }
  },

  /**
   * Open chat
   */
  async openChat() {
    if (!this.isAvailable) {
      console.error('Chat not available');
      return;
    }

    // Initialize chat handler if not already done
    if (window.ChatHandler && !window.ChatHandler.elements.chatForm) {
      window.ChatHandler.init();
    }

    // Update UI
    this.isOpen = true;
    this.elements.chatPanel?.setAttribute('data-chat-state', 'open');
    this.elements.toggleButton?.setAttribute('data-chat-state', 'open');
    this.elements.layoutWrapper?.classList.add('chat-enabled');

    // Highlight toggle button
    this.elements.toggleButton?.classList.add('text-primary', 'dark:text-darkmode-primary');

    // Save state
    this.saveState();

    // Show session list only if 2+ sessions exist, otherwise show normal view
    this.showSessionList();
  },

  /**
   * Close chat
   */
  closeChat() {
    this.isOpen = false;
    this.elements.chatPanel?.setAttribute('data-chat-state', 'closed');
    this.elements.toggleButton?.setAttribute('data-chat-state', 'closed');
    this.elements.layoutWrapper?.classList.remove('chat-enabled');

    // Remove toggle button highlight
    this.elements.toggleButton?.classList.remove('text-primary', 'dark:text-darkmode-primary');

    // Save state
    this.saveState();
  },

  /**
   * Save state to sessionStorage
   */
  saveState() {
    try {
      sessionStorage.setItem('aiChatOpen', this.isOpen.toString());
    } catch (error) {
      console.error('Failed to save chat state:', error);
    }
  },

  /**
   * Restore state from sessionStorage
   */
  restoreState() {
    try {
      const savedState = sessionStorage.getItem('aiChatOpen');
      if (savedState === 'true') {
        this.openChat();
      }
    } catch (error) {
      console.error('Failed to restore chat state:', error);
    }
  },

  /**
   * Show session list view (if any session has 2+ messages)
   */
  showSessionList() {
    // Filter sessions that have at least 2 messages (1 complete turn)
    const sessions = window.ChatSessionStorage?.getSessionsSorted() || [];
    const meaningfulSessions = sessions.filter(s => s.messages && s.messages.length >= 2);

    // Show listing if there's at least 1 meaningful session
    if (meaningfulSessions.length < 1) {
      // No meaningful sessions yet, show active chat view
      this.showActiveChat();
      return;
    }

    this.viewState = 'session-list';
    this.renderSessionList();

    // Gray out the bin (clear) button
    const clearButton = document.getElementById('clear-chat-btn');
    if (clearButton) {
      clearButton.disabled = true;
      clearButton.classList.add('opacity-50', 'cursor-not-allowed');
    }

    // Update history button to active state
    const historyButton = document.getElementById('history-btn');
    if (historyButton) {
      historyButton.classList.add('text-primary', 'dark:text-darkmode-primary');
    }
  },

  /**
   * Show active chat view
   */
  showActiveChat() {
    this.viewState = 'chat-active';

    // Enable the bin (clear) button
    const clearButton = document.getElementById('clear-chat-btn');
    if (clearButton) {
      clearButton.disabled = false;
      clearButton.classList.remove('opacity-50', 'cursor-not-allowed');
    }

    // Remove active state from history button
    const historyButton = document.getElementById('history-btn');
    if (historyButton) {
      historyButton.classList.remove('text-primary', 'dark:text-darkmode-primary');
    }

    // IMPORTANT: Clear the entire messages container first
    // This removes session list HTML if switching from listing view
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
      // Remove session list container if it exists
      const sessionListContainer = document.getElementById('session-list-container');
      if (sessionListContainer) {
        sessionListContainer.remove();
      }
    }

    // Render current session messages if any, otherwise clear to show empty state
    if (window.ChatSessionManager?.currentSessionId && window.ChatSessionStorage) {
      const sessionData = window.ChatSessionStorage.getSession(
        window.ChatSessionManager.currentSessionId
      );
      if (sessionData && sessionData.messages.length > 0) {
        this.restoreMessages(sessionData.messages);
      } else {
        // No messages, clear to show empty state
        this.clearMessages();
      }
    } else {
      // No session, clear to show empty state
      this.clearMessages();
    }

    // Update bin icon state based on current session
    if (window.ChatHandler) {
      window.ChatHandler.updateBinIconState();
    }
  },

  /**
   * Toggle between session list and active chat
   */
  toggleSessionList() {
    if (this.viewState === 'session-list') {
      this.showActiveChat();
    } else {
      this.showSessionList();
    }
  },

  /**
   * Render session list in the messages container
   * Note: Only shows sessions with at least 2 messages (1 complete turn)
   */
  renderSessionList() {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;

    // Clear messages container
    messagesContainer.innerHTML = '';

    // Get sessions from storage and filter to meaningful ones (2+ messages)
    const sessions = window.ChatSessionStorage?.getSessionsSorted() || [];
    const meaningfulSessions = sessions.filter(s => s.messages && s.messages.length >= 2);

    // Create session list container
    const sessionListEl = document.createElement('div');
    sessionListEl.className = 'session-list p-4 space-y-2';
    sessionListEl.id = 'session-list-container';

    // Render sessions directly (no header, no "New Chat" button)
    const sessionsEl = document.createElement('div');
    sessionsEl.className = 'sessions-container space-y-2';

    meaningfulSessions.forEach(session => {
      const sessionEl = document.createElement('div');
      sessionEl.className = 'session-item group relative bg-light dark:bg-darkmode-light rounded-lg p-3 hover:bg-primary/10 dark:hover:bg-darkmode-primary/10 transition-colors cursor-pointer';
      sessionEl.dataset.sessionId = session.id;

      // Highlight current session
      if (session.id === window.ChatSessionManager?.currentSessionId) {
        sessionEl.classList.add('ring-2', 'ring-primary', 'dark:ring-darkmode-primary');
      }

      const updatedDate = new Date(session.updatedAt);
      const formattedDate = this.formatSessionDate(updatedDate);

      sessionEl.innerHTML = `
        <div class="session-content pr-8">
          <h6 class="session-title font-medium text-text dark:text-darkmode-text truncate mb-1">
            ${this.escapeHtml(session.title)}
          </h6>
          <div class="session-meta flex items-center gap-3 text-xs text-text/60 dark:text-darkmode-text/60">
            <span class="flex items-center gap-1">
              <i class="fa-solid fa-clock"></i>
              ${formattedDate}
            </span>
            <span class="flex items-center gap-1">
              <i class="fa-solid fa-message"></i>
              ${session.messages.length}
            </span>
          </div>
        </div>
        <button
          class="session-delete-btn absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-red-500 dark:hover:text-red-400"
          data-session-id="${session.id}"
          title="Delete conversation">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      `;

      sessionsEl.appendChild(sessionEl);
    });

    sessionListEl.appendChild(sessionsEl);
    messagesContainer.appendChild(sessionListEl);

    // Setup event listeners for session list
    this.setupSessionListListeners();
  },

  /**
   * Format session date for display
   * @param {Date} date
   * @returns {string}
   */
  formatSessionDate(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  },

  /**
   * Setup event listeners for session list
   */
  setupSessionListListeners() {
    const sessionList = document.getElementById('session-list-container');

    // Session selection (event delegation)
    sessionList?.addEventListener('click', (e) => {
      // Find clicked session item
      const sessionItem = e.target.closest('.session-item');
      if (!sessionItem) return;

      // Ignore if delete button was clicked
      if (e.target.closest('.session-delete-btn')) return;

      const sessionId = sessionItem.dataset.sessionId;
      if (sessionId && window.ChatHandler) {
        window.ChatHandler.loadSession(sessionId);
      }
    });

    // Session deletion (event delegation)
    sessionList?.addEventListener('click', (e) => {
      const deleteBtn = e.target.closest('.session-delete-btn');
      if (!deleteBtn) return;

      e.stopPropagation();

      const sessionId = deleteBtn.dataset.sessionId;
      if (sessionId && window.ChatHandler) {
        window.ChatHandler.deleteSession(sessionId);
      }
    });
  },

  /**
   * Message counter for unique IDs
   */
  messageCounter: 0,

  /**
   * Cleanup resources
   */
  cleanup() {
    // Disconnect footer observer
    if (this.footerObserver) {
      this.footerObserver.disconnect();
      this.footerObserver = null;
    }
  },

  /**
   * Add a message to the UI
   * @param {string} role - 'user' or 'assistant'
   * @param {string} content - Message content
   * @returns {string} Message element ID
   */
  addMessage(role, content) {
    const messageId = `msg-${this.messageCounter++}`;
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return messageId;

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
    bubbleEl.className = `message-bubble relative ${
      role === 'user'
        ? 'bg-primary dark:bg-darkmode-primary'
        : 'bg-light dark:bg-darkmode-light'
    } rounded-lg px-4 py-3 ${role === 'assistant' ? 'pb-8' : ''}`;

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

    // Add speaker button for assistant messages
    if (role === 'assistant' && content) {
      const speakerBtn = document.createElement('button');
      speakerBtn.className = 'message-speaker-btn absolute bottom-2 right-2 text-xs text-text/50 dark:text-darkmode-text/50 hover:text-primary dark:hover:text-darkmode-primary transition-colors';
      speakerBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
      speakerBtn.title = 'Speak this message';
      speakerBtn.onclick = (e) => {
        e.stopPropagation();
        if (window.ChatTTS) {
          ChatTTS.speak(content, true); // Force speak
        }
      };
      bubbleEl.appendChild(speakerBtn);
    }

    contentEl.appendChild(bubbleEl);

    messageEl.appendChild(avatarEl);
    messageEl.appendChild(contentEl);

    messagesContainer.appendChild(messageEl);
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

    // Add/update speaker button for assistant message
    const bubbleEl = messageEl.querySelector('.message-bubble');
    if (bubbleEl && messageEl.classList.contains('assistant-message') && content) {
      let speakerBtn = bubbleEl.querySelector('.message-speaker-btn');

      if (!speakerBtn) {
        speakerBtn = document.createElement('button');
        speakerBtn.className = 'message-speaker-btn absolute bottom-2 right-2 text-xs text-text/50 dark:text-darkmode-text/50 hover:text-primary dark:hover:text-darkmode-primary transition-colors';
        speakerBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
        speakerBtn.title = 'Speak this message';
        speakerBtn.onclick = (e) => {
          e.stopPropagation();
          if (window.ChatTTS) {
            ChatTTS.speak(content, true); // Force speak
          }
        };
        bubbleEl.appendChild(speakerBtn);
      } else {
        // Update onclick with new content
        speakerBtn.onclick = (e) => {
          e.stopPropagation();
          if (window.ChatTTS) {
            ChatTTS.speak(content, true); // Force speak
          }
        };
      }
    }

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
   * @param {Array} messages - Array of message objects
   */
  restoreMessages(messages) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;

    // Clear current messages (keep empty state)
    const existingMessages = messagesContainer.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());

    // Add restored messages
    messages.forEach(msg => {
      if (msg.role === 'user' || msg.role === 'assistant') {
        this.addMessage(msg.role, msg.content);
      }
    });
  },

  /**
   * Clear all messages from UI
   */
  clearMessages() {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;

    // Clear UI (empty state will show automatically)
    const messages = messagesContainer.querySelectorAll('.message');
    messages.forEach(msg => msg.remove());

    // Ensure empty state exists (in case it was removed by renderSessionList)
    this.ensureEmptyState();
  },

  /**
   * Ensure the empty state HTML exists in the messages container
   */
  ensureEmptyState() {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;

    // Check if empty state already exists
    let emptyState = messagesContainer.querySelector('.chat-empty-state');

    // If it doesn't exist, create it
    if (!emptyState) {
      emptyState = document.createElement('div');
      emptyState.className = 'chat-empty-state';
      emptyState.innerHTML = `
        <i class="fa-solid fa-wand-magic-sparkles"></i>
        <h3>Hi! I am Daisy, how can I help you?</h3>
        <p class="tagline">I am a Fast, Free, Private and Personalised on-device GenAI chat experience powered by Prompt AI API.</p>
      `;
      messagesContainer.appendChild(emptyState);
    }
  },

  /**
   * Scroll to bottom of messages
   */
  scrollToBottom() {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
  },

  /**
   * Setup IntersectionObserver for footer to dynamically adjust chat height
   */
  setupFooterObserver() {
    if (!this.elements.footer || !this.elements.chatPanel) return;

    // Create observer to watch footer
    this.footerObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          this.adjustChatHeight(entry);
        });
      },
      {
        // Trigger when any part of footer enters viewport
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
        rootMargin: '0px'
      }
    );

    // Start observing footer
    this.footerObserver.observe(this.elements.footer);
  },

  /**
   * Adjust chat height based on footer visibility
   * @param {IntersectionObserverEntry} entry
   */
  adjustChatHeight(entry) {
    if (!this.elements.chatPanel) return;

    const headerHeight = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--header-height') || '0'
    );

    if (entry.isIntersecting) {
      // Footer is visible - calculate available space
      const footerRect = entry.target.getBoundingClientRect();
      const availableHeight = footerRect.top - headerHeight;

      // Set chat height to available space (minimum 200px to keep it usable)
      const newHeight = Math.max(availableHeight, 200);
      this.elements.chatPanel.style.height = `${newHeight}px`;
    } else {
      // Footer not visible - use full height
      this.elements.chatPanel.style.height = `calc(100vh - var(--header-height, 0px))`;
    }
  }
};

// Export for use in other modules
window.ChatUI = ChatUI;
