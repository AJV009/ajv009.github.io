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
      return;
    }

    // Calculate and set header height
    this.setHeaderHeight();

    // Show toggle button
    this.showToggleButton();

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
   * Show toggle button
   */
  showToggleButton() {
    if (this.elements.toggleButton) {
      this.elements.toggleButton.classList.remove('hidden');
    }
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

    // Focus input
    setTimeout(() => {
      document.getElementById('chat-input')?.focus();
    }, 300);
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
