// Scroll Reveal - IntersectionObserver-based scroll animations
(function () {
  "use strict";

  var ScrollReveal = {
    observer: null,

    init: function () {
      var elements = document.querySelectorAll("[data-animate]");

      // Respect prefers-reduced-motion
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        elements.forEach(function (el) {
          el.classList.add("is-visible");
        });
        return;
      }

      this.observer = new IntersectionObserver(
        this._onIntersect.bind(this),
        { threshold: 0.15, rootMargin: "0px 0px -50px 0px" }
      );

      elements.forEach(function (el) {
        this.observer.observe(el);
      }.bind(this));
    },

    observeNew: function (container) {
      if (!this.observer) return;
      var elements = container.querySelectorAll("[data-animate]:not(.is-visible)");
      elements.forEach(function (el) {
        this.observer.observe(el);
      }.bind(this));
    },

    _onIntersect: function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        var el = entry.target;
        var delay = el.getAttribute("data-animate-delay");
        if (delay) {
          el.style.animationDelay = delay + "ms";
        }
        el.classList.add("is-visible");
        this.observer.unobserve(el);
      }.bind(this));
    },
  };

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      ScrollReveal.init();
    });
  } else {
    ScrollReveal.init();
  }

  // Expose for dynamic content (infinite scroll, etc.)
  window.ScrollReveal = ScrollReveal;
})();
