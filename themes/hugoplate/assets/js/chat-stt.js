/**
 * Chat Speech-to-Text Module
 * Handles all STT functionality for the AI chat
 */

const ChatSTT = {
  // State
  recognition: null,
  isRecording: false,
  silenceTimer: null,
  lastTranscriptTime: 0,

  // Callbacks
  onTranscriptCallback: null,
  onCompleteCallback: null,

  /**
   * Initialize speech recognition
   * @param {Function} onTranscript - Called when speech is recognized (interim and final)
   * @param {Function} onComplete - Called when recording stops (for auto-send)
   * @returns {boolean} - True if STT is supported
   */
  init(onTranscript, onComplete) {
    // Store callbacks
    this.onTranscriptCallback = onTranscript;
    this.onCompleteCallback = onComplete;

    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser');
      return false;
    }

    // Create recognition instance
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

      // Callback with transcript
      if (this.onTranscriptCallback) {
        this.onTranscriptCallback(transcript, result.isFinal);
      }

      // Reset silence timer
      this.handleSilence();
    };

    // Handle errors
    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.stop();
    };

    // Handle end (restart for continuous recognition)
    this.recognition.onend = () => {
      if (this.isRecording) {
        // Restart if still recording (for continuous recognition)
        try {
          this.recognition.start();
        } catch (error) {
          // Ignore errors if recognition was stopped
          if (error.name !== 'InvalidStateError') {
            console.error('Error restarting recognition:', error);
          }
        }
      }
    };

    return true;
  },

  /**
   * Start recording
   * @returns {boolean} - True if recording started
   */
  start() {
    if (!this.recognition || this.isRecording) {
      return false;
    }

    try {
      this.recognition.start();
      this.isRecording = true;
      this.lastTranscriptTime = Date.now();

      // Start silence detection
      this.handleSilence();

      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      return false;
    }
  },

  /**
   * Stop recording
   * @returns {boolean} - True if recording was stopped
   */
  stop() {
    if (!this.recognition || !this.isRecording) {
      return false;
    }

    try {
      this.recognition.stop();
      this.isRecording = false;

      // Clear silence timer
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }

      // Trigger completion callback after small delay to ensure final transcript is captured
      if (this.onCompleteCallback) {
        setTimeout(() => {
          this.onCompleteCallback();
        }, 100);
      }

      return true;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      return false;
    }
  },

  /**
   * Toggle recording on/off
   * @returns {boolean} - New recording state
   */
  toggle() {
    if (this.isRecording) {
      this.stop();
    } else {
      this.start();
    }
    return this.isRecording;
  },

  /**
   * Handle silence detection (auto-stop after 6 seconds)
   * @private
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
        this.stop();
      }
    }, 6000);
  },

  /**
   * Get current recording state
   * @returns {boolean} - True if recording
   */
  getState() {
    return this.isRecording;
  },

  /**
   * Check if STT is supported
   * @returns {boolean}
   */
  isSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }
};

// Export for use in other modules
window.ChatSTT = ChatSTT;
