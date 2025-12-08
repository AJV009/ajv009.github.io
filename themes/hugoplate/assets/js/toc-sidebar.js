/**
 * ToC Sidebar - Scroll Tracking & Interaction
 * Uses IntersectionObserver to track reading progress
 */

const TocSidebar = {
  // DOM Elements
  panel: null,
  nav: null,
  links: [],
  headings: [],
  progressFill: null,
  progressText: null,

  // State
  activeIndex: -1,
  isInitialized: false,
  observer: null,

  /**
   * Initialize the ToC sidebar
   */
  init() {
    // Check if AI chat is available - if so, don't show ToC sidebar
    if (this.isAiChatAvailable()) {
      console.log('[ToC Sidebar] AI chat available, hiding ToC sidebar');
      return;
    }

    this.panel = document.getElementById('toc-sidebar-panel');
    if (!this.panel) {
      console.log('[ToC Sidebar] No ToC panel found');
      return;
    }

    this.nav = document.getElementById('toc-nav');
    this.progressFill = document.getElementById('toc-progress-fill');
    this.progressText = document.getElementById('toc-progress-text');

    if (!this.nav) return;

    // Get all ToC links
    this.links = Array.from(this.nav.querySelectorAll('a'));
    if (this.links.length === 0) return;

    // Get corresponding headings from the article
    this.headings = this.links.map(link => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        return document.getElementById(href.slice(1));
      }
      return null;
    }).filter(Boolean);

    if (this.headings.length === 0) return;

    // Set header height CSS variable (needed for sticky positioning)
    this.setHeaderHeight();

    // Initialize states
    this.initializeLinkStates();

    // Set up IntersectionObserver
    this.setupObserver();

    // Set up click handlers
    this.setupClickHandlers();

    // Set up jump buttons
    this.setupJumpButtons();

    // Show the sidebar
    this.show();

    // Enable layout
    this.enableLayout();

    this.isInitialized = true;
    console.log('[ToC Sidebar] Initialized with', this.headings.length, 'sections');
  },

  /**
   * Check if AI chat is available (Prompt API supported)
   * Returns true if AI chat should take precedence over ToC sidebar
   */
  isAiChatAvailable() {
    // Check for Prompt API support (the main indicator)
    const hasPromptAPI = 'LanguageModel' in window;

    // If browser supports Prompt API, AI chat takes precedence
    // (the ToC sidebar won't show, AI chat sidebar will be available)
    if (hasPromptAPI) {
      console.log('[ToC Sidebar] Prompt API supported, deferring to AI chat');
      return true;
    }

    // Also check if chat is already enabled (in case of edge cases)
    const wrapper = document.getElementById('chat-layout-wrapper');
    if (wrapper?.classList.contains('chat-enabled')) {
      return true;
    }

    return false;
  },

  /**
   * Calculate header height and set CSS variable
   * (Same as ChatUI.setHeaderHeight for consistency)
   */
  setHeaderHeight() {
    const header = document.querySelector('.header');
    if (header) {
      const headerHeight = header.offsetHeight;
      document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
    }
  },

  /**
   * Initialize all links with unread state
   */
  initializeLinkStates() {
    this.links.forEach(link => {
      link.classList.add('toc-unread');
      link.classList.remove('toc-read', 'toc-active');
    });
  },

  /**
   * Set up IntersectionObserver for scroll tracking
   */
  setupObserver() {
    const options = {
      root: null,
      rootMargin: '-10% 0px -70% 0px', // Trigger when heading is in upper portion
      threshold: 0
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const index = this.headings.indexOf(entry.target);
          if (index !== -1) {
            this.setActive(index);
          }
        }
      });
    }, options);

    // Observe all headings
    this.headings.forEach(heading => {
      this.observer.observe(heading);
    });

    // Also track scroll for progress
    window.addEventListener('scroll', () => this.updateProgress(), { passive: true });
  },

  /**
   * Set active section and update read/unread states
   */
  setActive(index) {
    if (index === this.activeIndex) return;

    this.activeIndex = index;

    this.links.forEach((link, i) => {
      link.classList.remove('toc-active', 'toc-read', 'toc-unread');

      if (i < index) {
        // Sections above current - read
        link.classList.add('toc-read');
      } else if (i === index) {
        // Current section - active
        link.classList.add('toc-active');
        // Scroll ToC to keep active item visible
        this.scrollToActiveLink(link);
      } else {
        // Sections below current - unread
        link.classList.add('toc-unread');
      }
    });

    this.updateProgress();
  },

  /**
   * Scroll ToC container to keep active link visible
   */
  scrollToActiveLink(link) {
    const container = document.getElementById('toc-sidebar-content');
    if (!container) return;

    const linkRect = link.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // Check if link is outside visible area
    if (linkRect.top < containerRect.top || linkRect.bottom > containerRect.bottom) {
      link.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  },

  /**
   * Update reading progress indicator
   */
  updateProgress() {
    if (!this.progressFill || !this.progressText) return;

    // Calculate progress based on scroll position
    const article = document.querySelector('article') || document.querySelector('.content');
    if (!article) return;

    const articleRect = article.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    // Calculate how much of the article has been scrolled past
    const articleTop = articleRect.top + window.scrollY;
    const articleHeight = articleRect.height;
    const scrolled = window.scrollY - articleTop + viewportHeight * 0.3;

    let progress = Math.max(0, Math.min(100, (scrolled / articleHeight) * 100));
    progress = Math.round(progress);

    this.progressFill.style.width = `${progress}%`;
    this.progressText.textContent = `${progress}%`;
  },

  /**
   * Set up click handlers for smooth scrolling
   */
  setupClickHandlers() {
    this.links.forEach((link, index) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();

        const heading = this.headings[index];
        if (!heading) return;

        // Add highlight effect
        link.classList.add('toc-highlight');
        setTimeout(() => link.classList.remove('toc-highlight'), 600);

        // Smooth scroll to heading
        const headerOffset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height') || '80');
        const elementPosition = heading.getBoundingClientRect().top + window.scrollY;
        const offsetPosition = elementPosition - headerOffset - 20;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });

        // Update active state
        this.setActive(index);
      });
    });
  },

  /**
   * Set up jump to top/bottom buttons
   */
  setupJumpButtons() {
    const jumpTop = document.getElementById('toc-jump-top');
    const jumpBottom = document.getElementById('toc-jump-bottom');

    if (jumpTop) {
      jumpTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    if (jumpBottom) {
      jumpBottom.addEventListener('click', () => {
        const article = document.querySelector('article') || document.querySelector('.content');
        if (article) {
          const articleEnd = article.getBoundingClientRect().bottom + window.scrollY;
          window.scrollTo({ top: articleEnd - window.innerHeight + 100, behavior: 'smooth' });
        }
      });
    }
  },

  /**
   * Show the ToC sidebar
   */
  show() {
    if (this.panel) {
      this.panel.classList.remove('hidden');
      this.panel.setAttribute('data-toc-state', 'open');
    }
  },

  /**
   * Hide the ToC sidebar
   */
  hide() {
    if (this.panel) {
      this.panel.classList.add('hidden');
      this.panel.setAttribute('data-toc-state', 'closed');
      this.disableLayout();
    }
  },

  /**
   * Enable the grid layout for ToC sidebar
   */
  enableLayout() {
    const wrapper = document.getElementById('chat-layout-wrapper');
    if (wrapper) {
      wrapper.classList.add('toc-enabled');
    }
  },

  /**
   * Disable the grid layout
   */
  disableLayout() {
    const wrapper = document.getElementById('chat-layout-wrapper');
    if (wrapper) {
      wrapper.classList.remove('toc-enabled');
    }
  },

  /**
   * Cleanup observers
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.hide();
    this.isInitialized = false;
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Small delay to ensure AI chat detection runs first
  setTimeout(() => {
    TocSidebar.init();
  }, 100);
});

// Export for global access
window.TocSidebar = TocSidebar;
