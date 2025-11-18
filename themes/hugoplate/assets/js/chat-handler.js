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
    charCounter: null,
    sttButton: null,
    ttsButton: null
  },

  // Active response tracking
  isProcessingResponse: false,
  currentUserMessage: '',
  currentAssistantMessageId: null,

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
    this.elements.sttButton = document.getElementById('speech-to-text-btn');
    this.elements.ttsButton = document.getElementById('text-to-speech-btn');

    // Setup event listeners
    this.setupEventListeners();

    // Initialize TTS module
    if (window.ChatTTS) {
      ChatTTS.init();
    }

    // Initialize STT module with callbacks
    if (window.ChatSTT) {
      const sttSupported = ChatSTT.init(
        // onTranscript - called when speech is recognized
        (transcript, isFinal) => this.handleSpeechTranscript(transcript, isFinal),
        // onComplete - called when recording stops (auto-send)
        () => this.handleSpeechComplete()
      );

      // Hide STT button if not supported
      if (!sttSupported && this.elements.sttButton) {
        this.elements.sttButton.style.display = 'none';
      }
    }

    // Restore previous conversation if exists
    if (window.ChatUI && window.ChatSessionManager) {
      const messages = window.ChatSessionManager.getMessages();
      if (messages && messages.length > 0) {
        ChatUI.restoreMessages(messages);
      }
    }
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

    // Speech-to-text button (or cancel during response)
    this.elements.sttButton?.addEventListener('click', () => {
      if (this.isProcessingResponse) {
        this.cancelResponse();
      } else if (window.ChatSTT) {
        const isRecording = ChatSTT.toggle();
        // Update visual feedback
        if (isRecording) {
          this.elements.sttButton.classList.add('recording');
        } else {
          this.elements.sttButton.classList.remove('recording');
        }
      }
    });

    // Text-to-speech button
    this.elements.ttsButton?.addEventListener('click', () => {
      if (window.ChatTTS) {
        ChatTTS.toggle((isEnabled) => {
          this.updateTTSButtonUI(isEnabled);
        });
      }
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

    // Store current message for potential cancel
    this.currentUserMessage = message;
    this.isProcessingResponse = true;

    // Transform mic button to cancel
    this.setMicButtonToCancel();

    // Disable input while processing
    this.setInputEnabled(false);

    // Check if session is initialized
    if (!window.ChatSessionManager.isInitialized) {
      this.setPlaceholder('Initializing AI session...');

      const initialized = await window.ChatSessionManager.initialize();
      if (!initialized) {
        this.showError('Failed to initialize AI session. Please try again.');
        this.setInputEnabled(true);
        this.setPlaceholder('Type your message...');
        return;
      }
    }

    // Update placeholder
    this.setPlaceholder('Daisy is thinking...');

    // Clear input
    this.elements.chatInput.value = '';
    this.updateCharCounter();
    this.autoResizeTextarea(this.elements.chatInput);

    // Add user message to UI
    if (window.ChatUI) {
      ChatUI.addMessage('user', message);

      // Create placeholder for assistant response
      this.currentAssistantMessageId = ChatUI.addMessage('assistant', '');
    }

    let fullResponse = '';

    // Send message and handle streaming response
    await window.ChatSessionManager.sendMessage(
      message,
      // onChunk - update UI with each chunk
      (chunk, accumulated) => {
        fullResponse = accumulated;
        if (window.ChatUI) {
          ChatUI.updateMessage(this.currentAssistantMessageId, fullResponse);
        }
      },
      // onComplete
      () => {
        this.isProcessingResponse = false;
        this.currentUserMessage = '';
        this.currentAssistantMessageId = null;

        this.setInputEnabled(true);
        this.setPlaceholder('Type your message...');
        this.setMicButtonToRecord(); // Restore mic button
        this.elements.chatInput.focus();

        // Speak the complete message if TTS is enabled
        if (window.ChatTTS && fullResponse) {
          ChatTTS.speak(fullResponse);
        }
      },
      // onError
      (error) => {
        console.error('Error sending message:', error);
        this.showError('Failed to send message. Please try again.');

        this.isProcessingResponse = false;
        this.setInputEnabled(true);
        this.setPlaceholder('Type your message...');
        this.setMicButtonToRecord(); // Restore mic button

        if (window.ChatUI) {
          ChatUI.removeMessage(this.currentAssistantMessageId);
        }

        this.currentUserMessage = '';
        this.currentAssistantMessageId = null;
      }
    );
  },

  /**
   * Clear conversation
   */
  clearConversation() {
    // Clear from session manager
    window.ChatSessionManager?.clearConversation();

    // Clear UI
    if (window.ChatUI) {
      ChatUI.clearMessages();
    }
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
   * Set textarea placeholder
   * @param {string} text
   */
  setPlaceholder(text) {
    if (this.elements.chatInput) {
      this.elements.chatInput.placeholder = text;
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
   * Handle speech transcript from STT module
   * @param {string} transcript - The recognized text
   * @param {boolean} isFinal - Whether this is a final transcript
   */
  handleSpeechTranscript(transcript, isFinal) {
    // Only update textarea with final transcripts
    if (isFinal && transcript.trim()) {
      const currentText = this.elements.chatInput.value;
      this.elements.chatInput.value = currentText + (currentText ? ' ' : '') + transcript;
      this.updateCharCounter();
      this.autoResizeTextarea(this.elements.chatInput);
    }
  },

  /**
   * Handle speech recognition completion (for auto-send)
   */
  handleSpeechComplete() {
    // Remove recording visual feedback
    this.elements.sttButton?.classList.remove('recording');

    // Auto-send the message if there's text
    const text = this.elements.chatInput?.value.trim();
    if (text) {
      this.handleSendMessage();
    }
  },

  /**
   * Update TTS button UI based on state
   * @param {boolean} isEnabled - Whether TTS is enabled
   */
  updateTTSButtonUI(isEnabled) {
    const icon = this.elements.ttsButton?.querySelector('i');

    if (isEnabled) {
      this.elements.ttsButton?.classList.add('active');
      // Change icon to volume-high (enabled)
      if (icon) {
        icon.classList.remove('fa-volume-xmark');
        icon.classList.add('fa-volume-high');
      }
      // Update tooltip and aria-label
      if (this.elements.ttsButton) {
        this.elements.ttsButton.title = 'Auto-speak enabled';
        this.elements.ttsButton.setAttribute('aria-label', 'Auto-speak enabled');
      }
    } else {
      this.elements.ttsButton?.classList.remove('active');
      // Change icon to volume-xmark (muted)
      if (icon) {
        icon.classList.remove('fa-volume-high');
        icon.classList.add('fa-volume-xmark');
      }
      // Update tooltip and aria-label
      if (this.elements.ttsButton) {
        this.elements.ttsButton.title = 'Auto-speak disabled';
        this.elements.ttsButton.setAttribute('aria-label', 'Auto-speak disabled');
      }
    }
  },

  /**
   * Transform mic button to cancel icon
   */
  setMicButtonToCancel() {
    if (!this.elements.sttButton) return;

    const icon = this.elements.sttButton.querySelector('i');
    if (icon) {
      icon.classList.remove('fa-microphone');
      icon.classList.add('fa-xmark');
    }
    this.elements.sttButton.title = 'Cancel response';
    this.elements.sttButton.setAttribute('aria-label', 'Cancel response');
    this.elements.sttButton.classList.add('canceling');
  },

  /**
   * Transform cancel button back to mic
   */
  setMicButtonToRecord() {
    if (!this.elements.sttButton) return;

    const icon = this.elements.sttButton.querySelector('i');
    if (icon) {
      icon.classList.remove('fa-xmark');
      icon.classList.add('fa-microphone');
    }
    this.elements.sttButton.title = 'Voice input';
    this.elements.sttButton.setAttribute('aria-label', 'Start voice input');
    this.elements.sttButton.classList.remove('canceling');
  },

  /**
   * Cancel the current AI response
   */
  cancelResponse() {
    if (!this.isProcessingResponse) return;

    // Stop the session
    window.ChatSessionManager?.stopCurrentResponse();

    if (window.ChatUI) {
      // Remove partial assistant message
      if (this.currentAssistantMessageId) {
        ChatUI.removeMessage(this.currentAssistantMessageId);
      }

      // Remove the user message from UI (last user message)
      const messagesContainer = document.getElementById('chat-messages');
      const lastUserMessage = messagesContainer?.querySelector('.user-message:last-of-type');
      if (lastUserMessage) {
        lastUserMessage.remove();
      }
    }

    // Restore user message to textarea
    if (this.currentUserMessage) {
      this.elements.chatInput.value = this.currentUserMessage;
      this.updateCharCounter();
      this.autoResizeTextarea(this.elements.chatInput);
    }

    // Reset state
    this.isProcessingResponse = false;
    this.currentUserMessage = '';
    this.currentAssistantMessageId = null;

    // Re-enable input
    this.setInputEnabled(true);
    this.setPlaceholder('Type your message...');
    this.setMicButtonToRecord();
    this.elements.chatInput.focus();

    // Stop any ongoing speech
    if (window.ChatTTS) {
      ChatTTS.stop();
    }
  }
};



// Export for use in other modules
window.ChatHandler = ChatHandler;
