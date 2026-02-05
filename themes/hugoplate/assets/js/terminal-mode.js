/**
 * Terminal Mode Easter Egg
 * Konami Code or footer button toggles retro terminal/hacker aesthetic.
 * Persisted in sessionStorage (resets each browser session).
 */
(function () {
  'use strict';

  // Konami Code sequence
  var KONAMI = [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
    'b', 'a'
  ];
  var konamiPos = 0;

  var fontLoaded = false;
  var html = document.documentElement;

  // Boot sequence lines
  var BOOT_LINES = [
    '> INITIALIZING BOOT SEQUENCE...',
    '> LOADING KERNEL MODULES... OK',
    '> MOUNTING FILE SYSTEMS... OK',
    '> STARTING NETWORK SERVICES... OK',
    '> INITIALIZING DISPLAY DRIVER... OK',
    '> LOADING USER INTERFACE... OK',
    '> SYSTEM READY.',
    '> TERMINAL MODE ACTIVE'
  ];

  /* ---- Font Loader ---- */
  function loadFont() {
    if (fontLoaded) return;
    fontLoaded = true;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap';
    document.head.appendChild(link);
  }

  /* ---- Toast ---- */
  function showToast(msg) {
    var t = document.createElement('div');
    t.className = 'terminal-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    // trigger reflow then show
    t.offsetWidth;
    t.classList.add('terminal-toast-visible');
    setTimeout(function () {
      t.classList.remove('terminal-toast-visible');
      setTimeout(function () { t.remove(); }, 400);
    }, 2500);
  }

  /* ---- Boot Sequence ---- */
  function playBoot(cb) {
    var overlay = document.createElement('div');
    overlay.className = 'terminal-boot-overlay';
    var inner = document.createElement('div');
    inner.className = 'terminal-boot-inner';
    overlay.appendChild(inner);
    document.body.appendChild(overlay);

    var i = 0;
    function nextLine() {
      if (i >= BOOT_LINES.length) {
        // done — pause then fade out
        setTimeout(function () {
          overlay.classList.add('terminal-boot-fade');
          setTimeout(function () {
            overlay.remove();
            cb();
          }, 350);
        }, 500);
        return;
      }
      var line = document.createElement('div');
      line.className = 'terminal-boot-text';
      line.textContent = BOOT_LINES[i];
      inner.appendChild(line);
      i++;
      setTimeout(nextLine, 150);
    }
    nextLine();
  }

  /* ---- Dark mode helpers ---- */
  function forceDarkMode() {
    // Save current theme so we can restore it on deactivate
    var wasDark = html.classList.contains('dark');
    sessionStorage.setItem('terminalPrevDark', wasDark ? '1' : '0');
    // Force dark mode on
    html.classList.add('dark');
    // Disable the theme switcher toggle
    var sw = document.querySelector('[data-theme-switcher]');
    if (sw) {
      sw.checked = true;
      sw.disabled = true;
    }
    // Mark the container so CSS can style it as locked
    var container = document.querySelector('.theme-switcher');
    if (container) container.classList.add('terminal-locked');
  }

  function restoreDarkMode() {
    var wasDark = sessionStorage.getItem('terminalPrevDark') === '1';
    if (!wasDark) {
      html.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    sessionStorage.removeItem('terminalPrevDark');
    // Re-enable the theme switcher toggle
    var sw = document.querySelector('[data-theme-switcher]');
    if (sw) {
      sw.disabled = false;
      sw.checked = html.classList.contains('dark');
    }
    var container = document.querySelector('.theme-switcher');
    if (container) container.classList.remove('terminal-locked');
  }

  /* ---- Chat reset helper ---- */
  function resetChat() {
    if (window.ChatSessionManager) {
      window.ChatSessionManager.clearConversation();
      window.ChatSessionManager.initialize().catch(function () {});
    }
    // Clear the chat UI messages if available
    if (window.ChatUI && typeof window.ChatUI.clearMessages === 'function') {
      window.ChatUI.clearMessages();
    }
  }

  /* ---- Activate ---- */
  function activate(skipBoot) {
    loadFont();
    if (skipBoot) {
      html.classList.add('terminal-mode');
      forceDarkMode();
      sessionStorage.setItem('terminalMode', 'true');
      return;
    }
    playBoot(function () {
      html.classList.add('terminal-mode');
      forceDarkMode();
      sessionStorage.setItem('terminalMode', 'true');
      showToast('TERMINAL MODE ACTIVE');
      resetChat();
    });
  }

  /* ---- Deactivate ---- */
  function deactivate() {
    html.classList.remove('terminal-mode');
    restoreDarkMode();
    sessionStorage.removeItem('terminalMode');
    showToast('TERMINAL MODE DEACTIVATED');
    resetChat();
  }

  /* ---- Toggle ---- */
  function toggle() {
    if (html.classList.contains('terminal-mode')) {
      deactivate();
    } else {
      activate(false);
    }
  }

  /* ---- Konami Listener ---- */
  document.addEventListener('keydown', function (e) {
    var expected = KONAMI[konamiPos];
    if (e.key === expected) {
      konamiPos++;
      if (konamiPos === KONAMI.length) {
        konamiPos = 0;
        toggle();
      }
    } else {
      konamiPos = 0;
      // allow sequence to restart if this key is the first
      if (e.key === KONAMI[0]) konamiPos = 1;
    }
  });

  /* ---- Footer Button + session-restore lock ---- */
  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('terminal-mode-toggle');
    if (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        toggle();
      });
    }
    // If terminal mode was restored from session, lock the toggle now that DOM exists
    if (html.classList.contains('terminal-mode')) {
      forceDarkMode();
    }
  });

  /* ---- Session Restore ---- */
  if (sessionStorage.getItem('terminalMode') === 'true') {
    activate(true);
  }

  /* ---- Public API ---- */
  window.TerminalMode = {
    toggle: toggle,
    activate: function () { activate(false); },
    deactivate: deactivate,
    isActive: function () { return html.classList.contains('terminal-mode'); }
  };
})();
