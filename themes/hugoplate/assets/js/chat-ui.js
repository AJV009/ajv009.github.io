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
