/**
 * 🎈 HayDay Chat Loader - Site Integration
 * Bu dosya HayDay sitesinin her sayfasına eklenir
 * Floating chat button ekler ve popup açma işlevini sağlar
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    chatUrl: window.location.origin, // Chat popup URL
    buttonText: 'Destek',
    buttonEmoji: '💬',
    position: 'bottom-right', // bottom-right, bottom-left
    offsetX: 20,
    offsetY: 20,
    zIndex: 9999,
    storageKey: 'hd_chat_session'
  };

  // Chat Loader Class
  class HayDayChatLoader {
    constructor() {
      this.isLoaded = false;
      this.chatWindow = null;
      this.button = null;
      this.hasUnreadMessages = false;
      
      this.init();
    }

    init() {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.createChatButton());
      } else {
        this.createChatButton();
      }

      // Listen for messages from chat popup
      window.addEventListener('message', (event) => this.handleMessage(event));
      
      // Check for existing session
      this.checkExistingSession();
    }

    createChatButton() {
      // Don't add button if already exists or on chat pages
      if (this.isLoaded || this.isChatPage()) {
        return;
      }

      this.injectStyles();
      this.button = this.createButtonElement();
      document.body.appendChild(this.button);
      
      // Add click handler
      this.button.addEventListener('click', () => this.openChat());
      
      // Add hover effects
      this.setupHoverEffects();
      
      this.isLoaded = true;
      console.log('🤖 HayDay Chat button loaded');
    }

    isChatPage() {
      // Don't show button on chat-related pages
      const chatPages = ['admin.html', 'login.html', 'index.html'];
      const currentPage = window.location.pathname.split('/').pop();
      return chatPages.includes(currentPage);
    }

    injectStyles() {
      if (document.getElementById('hayday-chat-styles')) {
        return; // Styles already injected
      }

      const styles = document.createElement('style');
      styles.id = 'hayday-chat-styles';
      styles.textContent = `
        .hayday-chat-button {
          position: fixed;
          ${CONFIG.position.includes('bottom') ? 'bottom' : 'top'}: ${CONFIG.offsetY}px;
          ${CONFIG.position.includes('right') ? 'right' : 'left'}: ${CONFIG.offsetX}px;
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
          border-radius: 50%;
          box-shadow: 0 4px 20px rgba(76, 175, 80, 0.4);
          cursor: pointer;
          z-index: ${CONFIG.zIndex};
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: none;
          outline: none;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }

        .hayday-chat-button:hover {
          transform: scale(1.1);
          box-shadow: 0 8px 30px rgba(76, 175, 80, 0.6);
        }

        .hayday-chat-button:active {
          transform: scale(0.95);
        }

        .hayday-chat-button-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
        }

        .hayday-chat-emoji {
          font-size: 20px;
          margin-bottom: 2px;
          line-height: 1;
        }

        .hayday-chat-text {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          line-height: 1;
        }

        .hayday-chat-notification {
          position: absolute;
          top: -2px;
          right: -2px;
          width: 18px;
          height: 18px;
          background: #FF5722;
          border-radius: 50%;
          border: 2px solid white;
          display: none;
          animation: pulse 2s infinite;
        }

        .hayday-chat-notification.show {
          display: block;
        }

        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(255, 87, 34, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(255, 87, 34, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 87, 34, 0); }
        }

        .hayday-chat-button.minimized {
          width: 50px;
          height: 50px;
        }

        .hayday-chat-button.minimized .hayday-chat-text {
          display: none;
        }

        .hayday-chat-button.minimized .hayday-chat-emoji {
          font-size: 24px;
          margin-bottom: 0;
        }

        /* Mobile styles */
        @media (max-width: 768px) {
          .hayday-chat-button {
            width: 56px;
            height: 56px;
            ${CONFIG.position.includes('right') ? 'right' : 'left'}: 16px;
            ${CONFIG.position.includes('bottom') ? 'bottom' : 'top'}: 16px;
          }
          
          .hayday-chat-emoji {
            font-size: 22px;
          }
          
          .hayday-chat-text {
            font-size: 8px;
          }
        }

        /* Accessibility */
        .hayday-chat-button:focus-visible {
          outline: 3px solid #4CAF50;
          outline-offset: 2px;
        }

        /* Print hide */
        @media print {
          .hayday-chat-button {
            display: none !important;
          }
        }
      `;

      document.head.appendChild(styles);
    }

    createButtonElement() {
      const button = document.createElement('button');
      button.className = 'hayday-chat-button';
      button.setAttribute('aria-label', 'HayDay Destek Chat\'i Aç');
      button.setAttribute('title', 'Canlı destek için tıklayın');
      
      button.innerHTML = `
        <div class="hayday-chat-button-content">
          <div class="hayday-chat-emoji">${CONFIG.buttonEmoji}</div>
          <div class="hayday-chat-text">${CONFIG.buttonText}</div>
        </div>
        <div class="hayday-chat-notification" id="chatNotification"></div>
      `;

      return button;
    }

    setupHoverEffects() {
      let hoverTimeout;

      this.button.addEventListener('mouseenter', () => {
        clearTimeout(hoverTimeout);
        // Show tooltip or expand button if needed
      });

      this.button.addEventListener('mouseleave', () => {
        hoverTimeout = setTimeout(() => {
          // Hide tooltip or minimize button if needed
        }, 500);
      });

      // Touch device handling
      if ('ontouchstart' in window) {
        this.button.addEventListener('touchstart', (e) => {
          e.preventDefault();
          this.button.style.transform = 'scale(0.95)';
        });

        this.button.addEventListener('touchend', (e) => {
          e.preventDefault();
          this.button.style.transform = '';
          this.openChat();
        });
      }
    }

    openChat() {
      // Close existing chat window if open
      if (this.chatWindow && !this.chatWindow.closed) {
        this.chatWindow.focus();
        return;
      }

      // Mobile: Open in same tab
      if (this.isMobile()) {
        window.open(CONFIG.chatUrl, '_blank');
        return;
      }

      // Desktop: Open popup
      const windowFeatures = this.getWindowFeatures();
      this.chatWindow = window.open(
        CONFIG.chatUrl,
        'hayday-chat',
        windowFeatures
      );

      if (this.chatWindow) {
        this.chatWindow.focus();
        this.hideNotification();
        
        // Monitor chat window
        this.monitorChatWindow();
      } else {
        // Popup blocked - fallback to new tab
        console.warn('Popup blocked, opening in new tab');
        window.open(CONFIG.chatUrl, '_blank');
      }
    }

    getWindowFeatures() {
      const width = 450;
      const height = 650;
      const left = window.screen.width - width - 50;
      const top = Math.max(0, (window.screen.height - height) / 2);

      return [
        `width=${width}`,
        `height=${height}`,
        `left=${left}`,
        `top=${top}`,
        'resizable=yes',
        'scrollbars=no',
        'toolbar=no',
        'menubar=no',
        'location=no',
        'status=no'
      ].join(',');
    }

    monitorChatWindow() {
      const checkClosed = () => {
        if (this.chatWindow && this.chatWindow.closed) {
          this.chatWindow = null;
          return;
        }
        setTimeout(checkClosed, 1000);
      };
      checkClosed();
    }

    handleMessage(event) {
      // Only accept messages from our chat domain
      if (event.origin !== window.location.origin) {
        return;
      }

      const { type, data } = event.data;

      switch (type) {
        case 'chat-new-message':
          this.showNotification();
          break;
        case 'chat-read':
          this.hideNotification();
          break;
        case 'chat-minimize':
          this.minimizeButton();
          break;
        case 'chat-restore':
          this.restoreButton();
          break;
      }
    }

    showNotification() {
      if (!this.hasUnreadMessages) {
        this.hasUnreadMessages = true;
        const notification = document.getElementById('chatNotification');
        if (notification) {
          notification.classList.add('show');
        }
      }
    }

    hideNotification() {
      this.hasUnreadMessages = false;
      const notification = document.getElementById('chatNotification');
      if (notification) {
        notification.classList.remove('show');
      }
    }

    minimizeButton() {
      if (this.button) {
        this.button.classList.add('minimized');
      }
    }

    restoreButton() {
      if (this.button) {
        this.button.classList.remove('minimized');
      }
    }

    checkExistingSession() {
      // Check if user has an existing chat session
      const sessionData = localStorage.getItem(CONFIG.storageKey);
      if (sessionData) {
        try {
          const session = JSON.parse(sessionData);
          // If session exists and is recent, show notification
          if (session.lastActivity && Date.now() - session.lastActivity < 30 * 60 * 1000) {
            setTimeout(() => this.showNotification(), 2000);
          }
        } catch (e) {
          // Invalid session data, clear it
          localStorage.removeItem(CONFIG.storageKey);
        }
      }
    }

    isMobile() {
      return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    // Public API
    show() {
      if (this.button) {
        this.button.style.display = 'flex';
      }
    }

    hide() {
      if (this.button) {
        this.button.style.display = 'none';
      }
    }

    setNotification(show = true) {
      if (show) {
        this.showNotification();
      } else {
        this.hideNotification();
      }
    }
  }

  // Initialize chat loader
  const chatLoader = new HayDayChatLoader();

  // Expose to global scope for manual control
  window.HayDayChat = window.HayDayChat || {};
  window.HayDayChat.loader = chatLoader;

  // Auto-show notification for returning users (optional)
  if (document.referrer && !document.referrer.includes(window.location.hostname)) {
    // User came from external site, show notification after delay
    setTimeout(() => {
      if (Math.random() < 0.3) { // 30% chance to show notification
        chatLoader.setNotification(true);
      }
    }, 5000);
  }

})();

// Console info
console.log('🤖 HayDay Chat Loader initialized');