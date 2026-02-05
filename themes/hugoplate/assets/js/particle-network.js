// Particle Network - Canvas-based neural network animation for homepage banner
(function () {
  "use strict";

  var ParticleNetwork = {
    canvas: null,
    ctx: null,
    container: null,
    particles: [],
    mouse: { x: -9999, y: -9999 },
    animationId: null,
    isVisible: true,
    resizeTimeout: null,
    dpr: 1,

    // Configuration
    config: {
      particleCountDesktop: 70,
      particleCountMobile: 30,
      mobileBreakpoint: 768,
      baseSpeed: 0.4,
      maxSpeedMultiplier: 2,
      connectionDistance: 150,
      attractRadius: 200,
      repelRadius: 60,
      attractForce: 0.02,
      repelForce: 0.08,
      dotOpacity: 0.6,
      lineOpacityMax: 0.15,
      resizeDebounce: 250,
    },

    init: function () {
      this.canvas = document.getElementById("particle-network");
      this.container = document.getElementById("banner-section");

      // Silent no-op on non-homepage pages
      if (!this.canvas || !this.container) return;

      // Respect prefers-reduced-motion (CSS hides it, but also skip JS)
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      this.ctx = this.canvas.getContext("2d");
      this.dpr = window.devicePixelRatio || 1;

      this._sizeCanvas();
      this._createParticles();
      this._bindEvents();
      this._setupVisibilityObserver();
      this._animate();
    },

    _sizeCanvas: function () {
      var rect = this.container.getBoundingClientRect();
      this.canvas.width = rect.width * this.dpr;
      this.canvas.height = rect.height * this.dpr;
      this.canvas.style.width = rect.width + "px";
      this.canvas.style.height = rect.height + "px";
      this.ctx.scale(this.dpr, this.dpr);
    },

    _getParticleCount: function () {
      return window.innerWidth < this.config.mobileBreakpoint
        ? this.config.particleCountMobile
        : this.config.particleCountDesktop;
    },

    _createParticles: function () {
      var rect = this.container.getBoundingClientRect();
      var count = this._getParticleCount();
      this.particles = [];

      for (var i = 0; i < count; i++) {
        this.particles.push({
          x: Math.random() * rect.width,
          y: Math.random() * rect.height,
          vx: (Math.random() - 0.5) * this.config.baseSpeed * 2,
          vy: (Math.random() - 0.5) * this.config.baseSpeed * 2,
          radius: Math.random() * 2 + 1,
        });
      }
    },

    _bindEvents: function () {
      var self = this;

      this.container.addEventListener("mousemove", function (e) {
        var rect = self.container.getBoundingClientRect();
        self.mouse.x = e.clientX - rect.left;
        self.mouse.y = e.clientY - rect.top;
      });

      this.container.addEventListener("mouseleave", function () {
        self.mouse.x = -9999;
        self.mouse.y = -9999;
      });

      window.addEventListener("resize", function () {
        clearTimeout(self.resizeTimeout);
        self.resizeTimeout = setTimeout(function () {
          self._sizeCanvas();
          self._createParticles();
        }, self.config.resizeDebounce);
      });
    },

    _setupVisibilityObserver: function () {
      var self = this;
      var observer = new IntersectionObserver(
        function (entries) {
          self.isVisible = entries[0].isIntersecting;
        },
        { threshold: 0 }
      );
      observer.observe(this.container);
    },

    _getAccentColor: function () {
      var isDark = document.documentElement.classList.contains("dark");
      var prop = isDark ? "--accent-dark-rgb" : "--accent-primary-rgb";
      var rgb = getComputedStyle(document.documentElement)
        .getPropertyValue(prop)
        .trim();
      return rgb || "124, 58, 237";
    },

    _animate: function () {
      var self = this;

      function loop() {
        self.animationId = requestAnimationFrame(loop);
        if (!self.isVisible) return;
        self._update();
        self._draw();
      }

      loop();
    },

    _update: function () {
      var rect = this.container.getBoundingClientRect();
      var w = rect.width;
      var h = rect.height;
      var cfg = this.config;
      var maxSpeed = cfg.baseSpeed * cfg.maxSpeedMultiplier;

      for (var i = 0; i < this.particles.length; i++) {
        var p = this.particles[i];

        // Mouse interaction
        var dx = p.x - this.mouse.x;
        var dy = p.y - this.mouse.y;
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < cfg.attractRadius && dist > 0) {
          var nx = dx / dist;
          var ny = dy / dist;

          if (dist < cfg.repelRadius) {
            // Repel when too close
            p.vx += nx * cfg.repelForce;
            p.vy += ny * cfg.repelForce;
          } else {
            // Attract from afar
            p.vx -= nx * cfg.attractForce;
            p.vy -= ny * cfg.attractForce;
          }
        }

        // Velocity clamping
        var speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > maxSpeed) {
          p.vx = (p.vx / speed) * maxSpeed;
          p.vy = (p.vy / speed) * maxSpeed;
        }

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Edge wrapping
        if (p.x < -10) p.x = w + 10;
        else if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        else if (p.y > h + 10) p.y = -10;
      }
    },

    _draw: function () {
      var rect = this.container.getBoundingClientRect();
      var w = rect.width;
      var h = rect.height;
      var cfg = this.config;

      this.ctx.clearRect(0, 0, w, h);

      var rgb = this._getAccentColor();

      // Draw connections
      for (var i = 0; i < this.particles.length; i++) {
        for (var j = i + 1; j < this.particles.length; j++) {
          var a = this.particles[i];
          var b = this.particles[j];
          var dx = a.x - b.x;
          var dy = a.y - b.y;
          var dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < cfg.connectionDistance) {
            var opacity =
              cfg.lineOpacityMax * (1 - dist / cfg.connectionDistance);
            this.ctx.beginPath();
            this.ctx.strokeStyle = "rgba(" + rgb + ", " + opacity + ")";
            this.ctx.lineWidth = 0.8;
            this.ctx.moveTo(a.x, a.y);
            this.ctx.lineTo(b.x, b.y);
            this.ctx.stroke();
          }
        }
      }

      // Draw particles
      for (var k = 0; k < this.particles.length; k++) {
        var p = this.particles[k];
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fillStyle =
          "rgba(" + rgb + ", " + cfg.dotOpacity + ")";
        this.ctx.fill();
      }
    },
  };

  // Initialize on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      ParticleNetwork.init();
    });
  } else {
    ParticleNetwork.init();
  }
})();
