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

  // Message counter for unique IDs
  messageCounter: 0,

  // Speech recognition
  recognition: null,
  isRecording: false,
  silenceTimer: null,
  lastTranscriptTime: 0,

  // Text-to-speech
  isTTSEnabled: false,
  speechQueue: [],
  isSpeaking: false,

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

    // Initialize speech recognition
    this.initSpeechRecognition();

    // Initialize speech synthesis voices
    this.initSpeechVoices();

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

    // Speech-to-text button
    this.elements.sttButton?.addEventListener('click', () => {
      this.toggleSpeechRecognition();
    });

    // Text-to-speech button
    this.elements.ttsButton?.addEventListener('click', () => {
      this.toggleTTS();
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

        // Speak the complete message if TTS is enabled
        if (this.isTTSEnabled && fullResponse) {
          this.speakText(fullResponse);
        }
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
        this.speakText(content);
      };
      bubbleEl.appendChild(speakerBtn);
    }

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
          this.speakText(content);
        };
        bubbleEl.appendChild(speakerBtn);
      } else {
        // Update onclick with new content
        speakerBtn.onclick = (e) => {
          e.stopPropagation();
          this.speakText(content);
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
  },

  /**
   * Initialize speech synthesis voices
   */
  initSpeechVoices() {
    if (window.speechSynthesis) {
      // Load voices (some browsers need this)
      window.speechSynthesis.getVoices();

      // Reload voices when they change
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.getVoices();
        };
      }
    }
  },

  /**
   * Initialize speech recognition
   */
  initSpeechRecognition() {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Hide STT button if not supported
      if (this.elements.sttButton) {
        this.elements.sttButton.style.display = 'none';
      }
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    // Handle results
    this.recognition.onresult = (event) => {
      this.lastTranscriptTime = Date.now();

      // Get the latest transcript
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;

      // Update textarea with transcript
      if (result.isFinal) {
        const currentText = this.elements.chatInput.value;
        this.elements.chatInput.value = currentText + (currentText ? ' ' : '') + transcript;
        this.updateCharCounter();
        this.autoResizeTextarea(this.elements.chatInput);
      }

      // Reset silence timer
      this.handleSilence();
    };

    // Handle errors
    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.stopRecording();
    };

    // Handle end
    this.recognition.onend = () => {
      if (this.isRecording) {
        // Restart if still recording (for continuous recognition)
        this.recognition.start();
      }
    };
  },

  /**
   * Toggle speech recognition on/off
   */
  toggleSpeechRecognition() {
    if (!this.recognition) return;

    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  },

  /**
   * Start recording
   */
  startRecording() {
    if (!this.recognition || this.isRecording) return;

    try {
      this.recognition.start();
      this.isRecording = true;
      this.lastTranscriptTime = Date.now();

      // Visual feedback
      this.elements.sttButton?.classList.add('recording');

      // Start silence detection
      this.handleSilence();
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  },

  /**
   * Stop recording
   */
  stopRecording() {
    if (!this.recognition || !this.isRecording) return;

    try {
      this.recognition.stop();
      this.isRecording = false;

      // Visual feedback
      this.elements.sttButton?.classList.remove('recording');

      // Clear silence timer
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  },

  /**
   * Handle silence detection (auto-stop after 6 seconds)
   */
  handleSilence() {
    // Clear existing timer
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }

    // Set new timer for 6 seconds
    this.silenceTimer = setTimeout(() => {
      const timeSinceLastTranscript = Date.now() - this.lastTranscriptTime;

      // Stop if no transcript in last 6 seconds
      if (timeSinceLastTranscript >= 6000 && this.isRecording) {
        this.stopRecording();
      }
    }, 6000);
  },

  /**
   * Toggle TTS on/off
   */
  toggleTTS() {
    this.isTTSEnabled = !this.isTTSEnabled;

    const icon = this.elements.ttsButton?.querySelector('i');

    // Visual feedback
    if (this.isTTSEnabled) {
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
      // Stop any ongoing speech
      this.stopSpeaking();
    }
  },

  /**
   * Clean text for speech (remove emojis, symbols, markdown)
   * @param {string} text
   * @returns {string}
   */
  cleanTextForSpeech(text) {
    // Remove markdown formatting
    let cleaned = text
      .replace(/\*\*(.+?)\*\*/g, '$1') // Bold
      .replace(/\*(.+?)\*/g, '$1')     // Italic
      .replace(/`(.+?)`/g, '$1')       // Inline code
      .replace(/```[\s\S]*?```/g, '')  // Code blocks
      .replace(/^\s*#{1,6}\s+/gm, '')  // Headers
      .replace(/^\s*[-*+]\s+/gm, '')   // List items
      .replace(/^\s*\d+\.\s+/gm, '')   // Numbered lists
      .replace(/\[(.+?)\]\(.+?\)/g, '$1'); // Links

    // Remove emojis (comprehensive regex)
    cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Symbols & pictographs
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport & map symbols
      .replace(/[\u{1F700}-\u{1F77F}]/gu, '') // Alchemical symbols
      .replace(/[\u{1F780}-\u{1F7FF}]/gu, '') // Geometric shapes
      .replace(/[\u{1F800}-\u{1F8FF}]/gu, '') // Supplemental arrows
      .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental symbols
      .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '') // Chess symbols
      .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Symbols and pictographs extended
      .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Miscellaneous symbols
      .replace(/[\u{2700}-\u{27BF}]/gu, '');  // Dingbats

    // Remove special symbols (keep basic punctuation for natural pauses)
    cleaned = cleaned
      .replace(/[*_~`#]/g, '')           // Markdown symbols
      .replace(/[!?]{2,}/g, '.')         // Multiple !? to period
      .replace(/\.{2,}/g, '.')           // Multiple periods to one
      .replace(/\s+/g, ' ')              // Multiple spaces to one
      .trim();

    return cleaned;
  },

  /**
   * Speak text with male voice
   * @param {string} text
   */
  speakText(text) {
    if (!this.isTTSEnabled || !text.trim()) return;

    // Check browser support
    if (!window.speechSynthesis) return;

    // Clean text before speaking
    const cleanedText = this.cleanTextForSpeech(text);
    if (!cleanedText.trim()) return;

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.lang = 'en-US';
    utterance.rate = 1.0; // Normal speed
    utterance.pitch = 0.9; // Slightly lower pitch for male voice

    // Try to find a male voice
    const voices = window.speechSynthesis.getVoices();
    const maleVoice = voices.find(voice =>
      voice.lang.startsWith('en') &&
      (voice.name.toLowerCase().includes('male') ||
       voice.name.toLowerCase().includes('david') ||
       voice.name.toLowerCase().includes('james') ||
       voice.name.toLowerCase().includes('alex'))
    );

    if (maleVoice) {
      utterance.voice = maleVoice;
    }

    window.speechSynthesis.speak(utterance);
  },

  /**
   * Stop all speech
   */
  stopSpeaking() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }
};

// Export for use in other modules
window.ChatHandler = ChatHandler;
