/**
 * Viewport Context Extractor
 * Extracts text content currently visible in the browser viewport
 * Provides page context to enhance AI responses with relevant content
 */

const ChatViewportContext = {

  /**
   * Get text from currently visible viewport
   * @returns {string} Cleaned viewport text
   */
  getViewportText() {
    // Find main content area (Hugo typically uses <main> or <article>)
    const mainContent = document.querySelector('main, article, .content');
    if (!mainContent) {
      return this.getFallbackContext();
    }

    // Get all elements in viewport
    const visibleElements = this.getVisibleElements(mainContent);

    if (visibleElements.length === 0) {
      return this.getFallbackContext();
    }

    // Extract and clean text
    const text = this.extractText(visibleElements);

    // Truncate if too long (max ~2000 tokens = ~8000 chars)
    return this.truncateText(text, 8000);
  },

  /**
   * Find elements currently visible in viewport
   * @param {Element} container - Container element to search within
   * @returns {Array<Element>} Array of visible elements
   */
  getVisibleElements(container) {
    const visibleElements = [];
    const processedElements = new Set();

    // Get all text-containing elements
    const allElements = container.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, pre, code, blockquote, img');

    allElements.forEach(element => {
      // Skip if already processed or should be excluded
      if (processedElements.has(element) || this.shouldSkipElement(element)) {
        return;
      }

      // Check if element is in viewport
      const rect = element.getBoundingClientRect();
      const isVisible = (
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.width > 0 &&
        rect.height > 0
      );

      if (isVisible) {
        visibleElements.push(element);
        processedElements.add(element);
      }
    });

    return visibleElements;
  },

  /**
   * Check if element should be skipped
   * @param {Element} element - Element to check
   * @returns {boolean} True if element should be skipped
   */
  shouldSkipElement(element) {
    // Skip chat panel, navigation, footer, etc.
    const skipSelectors = [
      'nav', 'header', 'footer', 'aside',
      '.chat-panel', '#chat-panel', '#ai-chat-panel',
      '.navigation', '.sidebar', '.menu',
      '.header', '.footer', '.nav'
    ];

    // Check if element or any parent matches skip selectors
    for (const selector of skipSelectors) {
      if (element.matches(selector) || element.closest(selector)) {
        return true;
      }
    }

    return false;
  },

  /**
   * Extract clean text from elements
   * @param {Array<Element>} elements - Elements to extract text from
   * @returns {string} Extracted and formatted text
   */
  extractText(elements) {
    const textParts = [];
    const processedText = new Set();

    elements.forEach(element => {
      const tagName = element.tagName.toLowerCase();
      let text = '';

      // Extract text based on element type
      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
        text = `\n## ${element.textContent.trim()}\n`;
      }
      else if (tagName === 'p') {
        text = element.textContent.trim();
      }
      else if (tagName === 'pre') {
        // Include code blocks with markers
        const codeContent = element.textContent.trim();
        text = `\n\`\`\`\n${codeContent}\n\`\`\`\n`;
      }
      else if (tagName === 'code' && !element.closest('pre')) {
        // Inline code
        text = `\`${element.textContent.trim()}\``;
      }
      else if (tagName === 'li') {
        text = `- ${element.textContent.trim()}`;
      }
      else if (tagName === 'blockquote') {
        text = `> ${element.textContent.trim()}`;
      }
      else if (tagName === 'img') {
        // Include alt text from images
        const alt = element.getAttribute('alt');
        if (alt && alt.trim()) {
          text = `[Image: ${alt.trim()}]`;
        }
      }

      // Add text if not empty and not duplicate
      if (text && !processedText.has(text)) {
        textParts.push(text);
        processedText.add(text);
      }
    });

    return textParts.join('\n\n');
  },

  /**
   * Truncate text to max length with smart breaking
   * @param {string} text - Text to truncate
   * @param {number} maxChars - Maximum characters
   * @returns {string} Truncated text
   */
  truncateText(text, maxChars) {
    if (!text || text.length <= maxChars) {
      return text;
    }

    // Find last paragraph break within limit
    const truncated = text.substring(0, maxChars);
    const lastParagraph = truncated.lastIndexOf('\n\n');

    // Use paragraph break if it's not too far back (>70% of max)
    if (lastParagraph > maxChars * 0.7) {
      return truncated.substring(0, lastParagraph) + '\n\n[...content continues below...]';
    }

    // Otherwise just truncate at character limit
    return truncated + '\n\n[...truncated...]';
  },

  /**
   * Fallback context when no main content found
   * @returns {string} Basic page metadata
   */
  getFallbackContext() {
    return `Page: ${document.title}\nURL: ${window.location.pathname}`;
  },

  /**
   * Get page metadata
   * @returns {Object} Page metadata
   */
  getPageMetadata() {
    return {
      title: document.title,
      url: window.location.pathname,
      description: document.querySelector('meta[name="description"]')?.content || ''
    };
  },

  /**
   * Format context for AI prompt
   * @param {string} viewportText - Extracted viewport text
   * @returns {string} Formatted context string
   */
  formatContext(viewportText) {
    const metadata = this.getPageMetadata();

    let context = `[Current Page Context]\n`;
    context += `Page: ${metadata.title}\n`;
    context += `URL: ${metadata.url}\n`;

    if (viewportText && viewportText.trim()) {
      context += `\nVisible Content:\n${viewportText}\n`;
    }

    context += `\n[User Question]`;

    return context;
  },

  /**
   * Check if meaningful context is available
   * @returns {boolean} True if context extraction is possible
   */
  hasContext() {
    const mainContent = document.querySelector('main, article, .content');
    return mainContent !== null;
  }
};

// Export for use in other modules
window.ChatViewportContext = ChatViewportContext;
