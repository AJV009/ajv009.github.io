/**
 * Prompt API Detection Module
 * Detects availability of Chrome's built-in Prompt API (Gemini Nano)
 */

const PromptAPIDetector = {
  // Cache the detection result for the session
  cachedStatus: null,

  /**
   * Check if Prompt API is available
   * @returns {Promise<Object>} { available: boolean, status: string, message: string }
   */
  async checkAvailability() {
    // Return cached result if available
    if (this.cachedStatus) {
      return this.cachedStatus;
    }

    // Check if running in compatible browser
    if (!window.LanguageModel) {
      this.cachedStatus = {
        available: false,
        status: 'unavailable',
        message: 'Prompt API not supported in this browser'
      };
      return this.cachedStatus;
    }

    try {
      const availability = await window.LanguageModel.availability();

      let result;
      switch (availability) {
        case 'available':
          result = {
            available: true,
            status: 'available',
            message: 'AI Assistant ready'
          };
          break;

        case 'downloading':
          result = {
            available: false,
            status: 'downloading',
            message: 'AI model is downloading... This may take a few minutes'
          };
          break;

        case 'downloadable':
          result = {
            available: false,
            status: 'downloadable',
            message: 'AI model needs to be downloaded. Interact with the chat to start download.'
          };
          break;

        default:
          result = {
            available: false,
            status: 'unavailable',
            message: 'AI Assistant is not available on this device'
          };
      }

      // Cache only if status is final (available or unavailable)
      if (availability === 'available' || availability === 'unavailable') {
        this.cachedStatus = result;
      }

      return result;

    } catch (error) {
      console.error('Error checking Prompt API availability:', error);
      this.cachedStatus = {
        available: false,
        status: 'error',
        message: 'Error checking AI availability'
      };
      return this.cachedStatus;
    }
  },

  /**
   * Check if device is in landscape orientation (desktop-like)
   * @returns {boolean}
   */
  isLandscapeOrientation() {
    return window.matchMedia('(orientation: landscape)').matches;
  },

  /**
   * Check if AI chat should be enabled (API available + landscape orientation)
   * @returns {Promise<Object>}
   */
  async shouldEnableChat() {
    const apiStatus = await this.checkAvailability();
    const isLandscape = this.isLandscapeOrientation();

    return {
      ...apiStatus,
      enabled: apiStatus.available && isLandscape,
      orientationRestricted: !isLandscape
    };
  },

  /**
   * Listen for orientation changes
   * @param {Function} callback - Called when orientation changes
   */
  onOrientationChange(callback) {
    const mediaQuery = window.matchMedia('(orientation: landscape)');
    mediaQuery.addEventListener('change', (e) => {
      callback(e.matches);
    });
  },

  /**
   * Clear cached status (useful for retry scenarios)
   */
  clearCache() {
    this.cachedStatus = null;
  }
};

// Export for use in other modules
window.PromptAPIDetector = PromptAPIDetector;
