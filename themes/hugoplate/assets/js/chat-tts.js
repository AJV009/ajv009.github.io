/**
 * Chat Text-to-Speech Module
 * Handles all TTS functionality for the AI chat
 */

const ChatTTS = {
  // State
  isEnabled: false,

  /**
   * Initialize TTS voices
   * Call this on page load to ensure voices are loaded
   */
  init() {
    if (!window.speechSynthesis) {
      console.warn('Speech synthesis not supported in this browser');
      return false;
    }

    // Load voices (some browsers need this)
    window.speechSynthesis.getVoices();

    // Reload voices when they change
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }

    return true;
  },

  /**
   * Toggle TTS on/off
   * @param {Function} onStateChange - Callback with new state (enabled: boolean)
   */
  toggle(onStateChange) {
    this.isEnabled = !this.isEnabled;

    // Stop any ongoing speech when disabling
    if (!this.isEnabled) {
      this.stop();
    }

    // Notify caller of state change
    if (onStateChange) {
      onStateChange(this.isEnabled);
    }

    return this.isEnabled;
  },

  /**
   * Clean text for speech (remove emojis, symbols, markdown)
   * @param {string} text - Raw text with markdown/emojis
   * @returns {string} - Cleaned text suitable for speech
   */
  cleanTextForSpeech(text) {
    // Remove markdown formatting
    let cleaned = text
      .replace(/\*\*(.+?)\*\*/g, '$1')      // Bold
      .replace(/\*(.+?)\*/g, '$1')          // Italic
      .replace(/`(.+?)`/g, '$1')            // Inline code
      .replace(/```[\s\S]*?```/g, '')       // Code blocks
      .replace(/^\s*#{1,6}\s+/gm, '')       // Headers
      .replace(/^\s*[-*+]\s+/gm, '')        // List items
      .replace(/^\s*\d+\.\s+/gm, '')        // Numbered lists
      .replace(/\[(.+?)\]\(.+?\)/g, '$1');  // Links

    // Remove emojis (comprehensive regex)
    cleaned = cleaned
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
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
      .replace(/[*_~`#]/g, '')              // Markdown symbols
      .replace(/[!?]{2,}/g, '.')            // Multiple !? to period
      .replace(/\.{2,}/g, '.')              // Multiple periods to one
      .replace(/\s+/g, ' ')                 // Multiple spaces to one
      .trim();

    return cleaned;
  },

  /**
   * Speak text with male voice
   * @param {string} text - Text to speak
   * @param {boolean} force - Force speak even if TTS is disabled (for manual playback)
   * @returns {boolean} - True if speech was initiated
   */
  speak(text, force = false) {
    // Check if should speak
    if ((!this.isEnabled && !force) || !text.trim()) {
      return false;
    }

    // Check browser support
    if (!window.speechSynthesis) {
      return false;
    }

    // Clean text before speaking
    const cleanedText = this.cleanTextForSpeech(text);
    if (!cleanedText.trim()) {
      return false;
    }

    // Create utterance
    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;   // Normal speed
    utterance.pitch = 0.9;  // Slightly lower pitch for male voice

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

    // Speak
    window.speechSynthesis.speak(utterance);
    return true;
  },

  /**
   * Stop all speech
   */
  stop() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  },

  /**
   * Get current TTS state
   * @returns {boolean} - True if TTS is enabled
   */
  getState() {
    return this.isEnabled;
  }
};

// Export for use in other modules
window.ChatTTS = ChatTTS;
