// Micro-Interactions - 3D Card Tilt, Magnetic Buttons, Card Flip
(function () {
  "use strict";

  var isTouch = "ontouchstart" in window;
  var prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var skipJS = isTouch || prefersReducedMotion;

  // ============================================
  //  CardTilt — 3D perspective tilt on [data-tilt]
  // ============================================
  var CardTilt = {
    config: {
      maxRotation: 5,
      perspective: 800,
      scale: 1.02,
      liftY: -6,
      speed: 400,
      shadowShift: 10,
    },

    init: function () {
      if (skipJS) return;
      var cards = document.querySelectorAll("[data-tilt]");
      for (var i = 0; i < cards.length; i++) {
        this.attach(cards[i]);
      }
    },

    attach: function (el) {
      if (el._tiltAttached) return;
      el._tiltAttached = true;

      el.style.willChange = "transform, box-shadow";

      var cfg = this.config;

      el.addEventListener("mouseenter", function () {
        el.style.transition =
          "transform " + cfg.speed + "ms ease, box-shadow " + cfg.speed + "ms ease";
        el.style.transform =
          "perspective(" + cfg.perspective + "px) " +
          "translateY(" + cfg.liftY + "px) " +
          "scale(" + cfg.scale + ") " +
          "rotateX(0deg) rotateY(0deg)";
      });

      el.addEventListener("mousemove", function (e) {
        var rect = el.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        var cx = rect.width / 2;
        var cy = rect.height / 2;

        var rotateY = ((x - cx) / cx) * cfg.maxRotation;
        var rotateX = ((cy - y) / cy) * cfg.maxRotation;

        var shadowX = -rotateY * (cfg.shadowShift / cfg.maxRotation);
        var shadowY = rotateX * (cfg.shadowShift / cfg.maxRotation);

        el.style.transition = "none";
        el.style.transform =
          "perspective(" + cfg.perspective + "px) " +
          "translateY(" + cfg.liftY + "px) " +
          "scale(" + cfg.scale + ") " +
          "rotateX(" + rotateX.toFixed(2) + "deg) " +
          "rotateY(" + rotateY.toFixed(2) + "deg)";
        el.style.boxShadow =
          shadowX.toFixed(1) + "px " +
          (shadowY.toFixed(1) * 1 + 8) + "px " +
          "32px rgba(31, 38, 135, 0.18)";
      });

      el.addEventListener("mouseleave", function () {
        el.style.transition =
          "transform " + cfg.speed + "ms ease, box-shadow " + cfg.speed + "ms ease";
        el.style.transform = "";
        el.style.boxShadow = "";
      });
    },

    observeNew: function (container) {
      if (skipJS) return;
      var cards = container.querySelectorAll("[data-tilt]");
      for (var i = 0; i < cards.length; i++) {
        this.attach(cards[i]);
      }
    },
  };

  // ============================================
  //  MagneticButton — cursor-follow on [data-magnetic]
  // ============================================
  var MagneticButton = {
    config: {
      strength: 0.3,
    },

    init: function () {
      if (skipJS) return;
      var btns = document.querySelectorAll("[data-magnetic]");
      for (var i = 0; i < btns.length; i++) {
        this.attach(btns[i]);
      }
    },

    attach: function (el) {
      if (el._magneticAttached) return;
      el._magneticAttached = true;

      var strength = this.config.strength;

      el.addEventListener("mousemove", function (e) {
        var rect = el.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;

        var dx = (e.clientX - cx) * strength;
        var dy = (e.clientY - cy) * strength;

        el.style.transition = "transform 0.1s ease";
        el.style.transform = "translate(" + dx.toFixed(1) + "px, " + dy.toFixed(1) + "px)";
      });

      el.addEventListener("mouseleave", function () {
        el.style.transition = "transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
        el.style.transform = "translate(0px, 0px)";
      });
    },
  };

  // ============================================
  //  CardFlip — click-to-flip on .flip-card
  // ============================================
  var CardFlip = {
    init: function () {
      var cards = document.querySelectorAll(".flip-card");
      if (!cards.length) return;

      for (var i = 0; i < cards.length; i++) {
        this.attach(cards[i]);
      }

      // Click outside any flip card -> unflip all
      document.addEventListener("click", function (e) {
        if (!e.target.closest(".flip-card")) {
          var flipped = document.querySelectorAll(".flip-card.is-flipped");
          for (var j = 0; j < flipped.length; j++) {
            flipped[j].classList.remove("is-flipped");
          }
        }
      });
    },

    attach: function (el) {
      if (el._flipAttached) return;
      el._flipAttached = true;

      el.addEventListener("click", function (e) {
        // If clicking a link on the front face, let it navigate
        if (e.target.closest("a") && !el.classList.contains("is-flipped")) {
          return;
        }
        // If clicking the "View Details" link on the back, let it navigate
        if (e.target.closest("a")) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        el.classList.toggle("is-flipped");
      });

      // Keyboard support
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          el.classList.toggle("is-flipped");
        }
      });
    },
  };

  // ============================================
  //  Init on DOMContentLoaded
  // ============================================
  function init() {
    CardTilt.init();
    MagneticButton.init();
    CardFlip.init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose for infinite scroll
  window.CardTilt = CardTilt;
})();
