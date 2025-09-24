/**
 * 🔧 HayDay Chat System - Advanced Utilities
 * Extended utility functions for chat system
 */

// Utils namespace
window.HayDayChat = window.HayDayChat || {};
window.HayDayChat.AdvancedUtils = {

  /**
   * 📊 Data Processing Utilities
   */
  DataProcessor: {
    // Group messages by conversation
    groupByConversation: function(messages) {
      const conversations = {};
      
      messages.forEach(message => {
        if (!conversations[message.clientId]) {
          conversations[message.clientId] = {
            clientId: message.clientId,
            messages: [],
            startTime: message.timestamp,
            lastActivity: message.timestamp,
            messageCount: 0
          };
        }
        
        conversations[message.clientId].messages.push(message);
        conversations[message.clientId].lastActivity = Math.max(
          conversations[message.clientId].lastActivity, 
          message.timestamp
        );
        conversations[message.clientId].messageCount++;
      });
      
      return Object.values(conversations);
    },

    // Group messages by time periods
    groupByTime: function(messages, period = 'hour') {
      const groups = {};
      
      messages.forEach(message => {
        const date = new Date(message.timestamp);
        let key;
        
        switch (period) {
          case 'hour':
            key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
            break;
          case 'day':
            key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
            break;
          case 'week':
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            key = `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;
            break;
          case 'month':
            key = `${date.getFullYear()}-${date.getMonth()}`;
            break;
        }
        
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(message);
      });
      
      return groups;
    },

    // Calculate conversation metrics
    calculateMetrics: function(conversations) {
      const metrics = {
        totalConversations: conversations.length,
        totalMessages: 0,
        avgMessagesPerConversation: 0,
        avgConversationDuration: 0,
        roleDistribution: {},
        timeDistribution: {},
        responseTimeStats: []
      };

      conversations.forEach(conv => {
        metrics.totalMessages += conv.messages.length;
        
        // Role distribution
        conv.messages.forEach(msg => {
          metrics.roleDistribution[msg.role] = (metrics.roleDistribution[msg.role] || 0) + 1;
        });

        // Response times
        for (let i = 1; i < conv.messages.length; i++) {
          const responseTime = conv.messages[i].timestamp - conv.messages[i-1].timestamp;
          if (conv.messages[i].role !== 'user' && conv.messages[i-1].role === 'user') {
            metrics.responseTimeStats.push(responseTime);
          }
        }

        // Time distribution
        const hour = new Date(conv.startTime).getHours();
        metrics.timeDistribution[hour] = (metrics.timeDistribution[hour] || 0) + 1;
      });

      // Calculate averages
      if (conversations.length > 0) {
        metrics.avgMessagesPerConversation = metrics.totalMessages / conversations.length;
        
        const durations = conversations.map(c => c.lastActivity - c.startTime);
        metrics.avgConversationDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      }

      if (metrics.responseTimeStats.length > 0) {
        metrics.avgResponseTime = metrics.responseTimeStats.reduce((a, b) => a + b, 0) / metrics.responseTimeStats.length;
        metrics.medianResponseTime = this.calculateMedian(metrics.responseTimeStats);
      }

      return metrics;
    },

    // Calculate median value
    calculateMedian: function(values) {
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    },

    // Export data to CSV
    exportToCSV: function(data, filename = 'hayday-chat-export.csv') {
      const csvContent = this.convertToCSV(data);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    },

    // Convert array of objects to CSV
    convertToCSV: function(data) {
      if (!data || data.length === 0) return '';
      
      const headers = Object.keys(data[0]);
      const csvRows = [];
      
      // Add headers
      csvRows.push(headers.join(','));
      
      // Add data rows
      data.forEach(row => {
        const values = headers.map(header => {
          const value = row[header];
          // Escape commas and quotes
          return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
        });
        csvRows.push(values.join(','));
      });
      
      return csvRows.join('\n');
    }
  },

  /**
   * 📱 Mobile & Device Utilities
   */
  DeviceUtils: {
    // Detect device type
    getDeviceInfo: function() {
      const ua = navigator.userAgent;
      return {
        isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
        isTablet: /iPad|Android(?=.*\bMobile\b)(?=.*\bSafari\b)/i.test(ua),
        isIOS: /iPad|iPhone|iPod/.test(ua),
        isAndroid: /Android/i.test(ua),
        isSafari: /Safari/i.test(ua) && !/Chrome/i.test(ua),
        isChrome: /Chrome/i.test(ua),
        isFirefox: /Firefox/i.test(ua),
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        pixelRatio: window.devicePixelRatio || 1
      };
    },

    // Check if device supports features
    checkSupport: function() {
      return {
        localStorage: typeof Storage !== 'undefined',
        sessionStorage: typeof sessionStorage !== 'undefined',
        webSocket: typeof WebSocket !== 'undefined',
        notification: 'Notification' in window,
        serviceWorker: 'serviceWorker' in navigator,
        geolocation: 'geolocation' in navigator,
        camera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
        vibration: 'vibrate' in navigator,
        clipboard: 'clipboard' in navigator,
        share: 'share' in navigator
      };
    },

    // Get network information
    getNetworkInfo: function() {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      
      if (connection) {
        return {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData
        };
      }
      
      return { available: false };
    },

    // Request notification permission
    requestNotificationPermission: async function() {
      if (!('Notification' in window)) {
        return 'not-supported';
      }
      
      if (Notification.permission === 'granted') {
        return 'granted';
      }
      
      if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission;
      }
      
      return 'denied';
    },

    // Show desktop notification
    showNotification: function(title, options = {}) {
      if (Notification.permission === 'granted') {
        const notification = new Notification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          ...options
        });
        
        // Auto close after 5 seconds
        setTimeout(() => notification.close(), 5000);
        
        return notification;
      }
      return null;
    },

    // Vibrate device (mobile)
    vibrate: function(pattern = [200, 100, 200]) {
      if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
        return true;
      }
      return false;
    }
  },

  /**
   * 🎨 UI Enhancement Utilities
   */
  UIEnhancements: {
    // Create loading overlay
    createLoadingOverlay: function(message = 'Yükleniyor...') {
      const overlay = document.createElement('div');
      overlay.className = 'loading-overlay';
      overlay.innerHTML = `
        <div class="loading-content">
          <div class="loading-spinner"></div>
          <div class="loading-message">${message}</div>
        </div>
      `;
      
      // Add styles if not already present
      if (!document.getElementById('loading-overlay-styles')) {
        const styles = document.createElement('style');
        styles.id = 'loading-overlay-styles';
        styles.textContent = `
          .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
          }
          .loading-content {
            background: white;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #4CAF50;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 15px;
          }
          .loading-message {
            color: #333;
            font-weight: 500;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(styles);
      }
      
      document.body.appendChild(overlay);
      return overlay;
    },

    // Remove loading overlay
    removeLoadingOverlay: function(overlay) {
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    },

    // Create modal dialog
    createModal: function(title, content, options = {}) {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      
      const closeButton = options.showClose !== false ? 
        '<button class="modal-close" onclick="this.closest(\'.modal-overlay\').remove()">&times;</button>' : '';
      
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">${title}</h3>
            ${closeButton}
          </div>
          <div class="modal-body">
            ${content}
          </div>
          ${options.footer ? `<div class="modal-footer">${options.footer}</div>` : ''}
        </div>
      `;
      
      // Add modal styles if not present
      if (!document.getElementById('modal-styles')) {
        const styles = document.createElement('style');
        styles.id = 'modal-styles';
        styles.textContent = `
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.2s ease;
          }
          .modal-content {
            background: white;
            border-radius: 12px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.3s ease;
          }
          .modal-header {
            padding: 20px 20px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .modal-title {
            margin: 0;
            color: #333;
          }
          .modal-close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #999;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .modal-body {
            padding: 20px;
          }
          .modal-footer {
            padding: 0 20px 20px;
            display: flex;
            gap: 10px;
            justify-content: flex-end;
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideIn {
            from { transform: translateY(-50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `;
        document.head.appendChild(styles);
      }
      
      // Close on overlay click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.remove();
        }
      });
      
      // Close on Escape key
      const escapeHandler = (e) => {
        if (e.key === 'Escape') {
          modal.remove();
          document.removeEventListener('keydown', escapeHandler);
        }
      };
      document.addEventListener('keydown', escapeHandler);
      
      document.body.appendChild(modal);
      return modal;
    },

    // Create tooltip
    addTooltip: function(element, text, position = 'top') {
      element.setAttribute('data-tooltip', text);
      element.setAttribute('data-tooltip-position', position);
      
      // Add tooltip styles if not present
      if (!document.getElementById('tooltip-styles')) {
        const styles = document.createElement('style');
        styles.id = 'tooltip-styles';
        styles.textContent = `
          [data-tooltip] {
            position: relative;
            cursor: pointer;
          }
          [data-tooltip]:hover::after {
            content: attr(data-tooltip);
            position: absolute;
            background: #333;
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            white-space: nowrap;
            z-index: 1000;
            animation: tooltipFadeIn 0.2s ease;
          }
          [data-tooltip-position="top"]:hover::after {
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            margin-bottom: 8px;
          }
          [data-tooltip-position="bottom"]:hover::after {
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            margin-top: 8px;
          }
          [data-tooltip-position="left"]:hover::after {
            right: 100%;
            top: 50%;
            transform: translateY(-50%);
            margin-right: 8px;
          }
          [data-tooltip-position="right"]:hover::after {
            left: 100%;
            top: 50%;
            transform: translateY(-50%);
            margin-left: 8px;
          }
          @keyframes tooltipFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `;
        document.head.appendChild(styles);
      }
    },

    // Animate element
    animateElement: function(element, animation, duration = 300) {
      return new Promise((resolve) => {
        element.style.animation = `${animation} ${duration}ms ease`;
        
        setTimeout(() => {
          element.style.animation = '';
          resolve();
        }, duration);
      });
    }
  },

  /**
   * 🔍 Search & Filter Utilities
   */
  SearchUtils: {
    // Advanced text search
    searchText: function(text, query, options = {}) {
      const {
        caseSensitive = false,
        wholeWord = false,
        fuzzy = false,
        highlightMatch = false
      } = options;
      
      let searchText = caseSensitive ? text : text.toLowerCase();
      let searchQuery = caseSensitive ? query : query.toLowerCase();
      
      if (wholeWord) {
        const regex = new RegExp(`\\b${searchQuery}\\b`, caseSensitive ? 'g' : 'gi');
        const match = regex.test(searchText);
        
        if (highlightMatch && match) {
          return {
            found: true,
            highlighted: text.replace(regex, `<mark>$&</mark>`)
          };
        }
        
        return { found: match };
      }
      
      if (fuzzy) {
        return this.fuzzySearch(searchText, searchQuery, highlightMatch);
      }
      
      const found = searchText.includes(searchQuery);
      
      if (highlightMatch && found) {
        const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseSensitive ? 'g' : 'gi');
        return {
          found: true,
          highlighted: text.replace(regex, '<mark>$&</mark>')
        };
      }
      
      return { found };
    },

    // Fuzzy search implementation
    fuzzySearch: function(text, query, highlight = false) {
      let textIndex = 0;
      let queryIndex = 0;
      const matches = [];
      
      while (textIndex < text.length && queryIndex < query.length) {
        if (text[textIndex] === query[queryIndex]) {
          if (highlight) {
            matches.push(textIndex);
          }
          queryIndex++;
        }
        textIndex++;
      }
      
      const found = queryIndex === query.length;
      
      if (highlight && found) {
        let highlighted = '';
        let lastIndex = 0;
        
        matches.forEach(index => {
          highlighted += text.slice(lastIndex, index);
          highlighted += `<mark>${text[index]}</mark>`;
          lastIndex = index + 1;
        });
        highlighted += text.slice(lastIndex);
        
        return { found: true, highlighted };
      }
      
      return { found };
    },

    // Filter array of objects
    filterObjects: function(objects, filters) {
      return objects.filter(obj => {
        return Object.entries(filters).every(([key, value]) => {
          if (value === null || value === undefined || value === '') {
            return true;
          }
          
          const objValue = obj[key];
          
          if (typeof value === 'string') {
            return this.searchText(String(objValue), value).found;
          }
          
          if (Array.isArray(value)) {
            return value.includes(objValue);
          }
          
          return objValue === value;
        });
      });
    },

    // Sort objects by multiple criteria
    sortObjects: function(objects, sortConfig) {
      return objects.sort((a, b) => {
        for (const { key, direction = 'asc', type = 'string' } of sortConfig) {
          let aVal = a[key];
          let bVal = b[key];
          
          if (type === 'number') {
            aVal = Number(aVal) || 0;
            bVal = Number(bVal) || 0;
          } else if (type === 'date') {
            aVal = new Date(aVal).getTime();
            bVal = new Date(bVal).getTime();
          } else {
            aVal = String(aVal).toLowerCase();
            bVal = String(bVal).toLowerCase();
          }
          
          if (aVal < bVal) return direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
  },

  /**
   * 🔒 Security Utilities
   */
  SecurityUtils: {
    // Sanitize HTML input
    sanitizeHTML: function(str) {
      const temp = document.createElement('div');
      temp.textContent = str;
      return temp.innerHTML;
    },

    // Generate secure random string
    generateSecureId: function(length = 16) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      
      if (window.crypto && window.crypto.getRandomValues) {
        const array = new Uint8Array(length);
        window.crypto.getRandomValues(array);
        for (let i = 0; i < length; i++) {
          result += chars[array[i] % chars.length];
        }
      } else {
        // Fallback for older browsers
        for (let i = 0; i < length; i++) {
          result += chars[Math.floor(Math.random() * chars.length)];
        }
      }
      
      return result;
    },

    // Validate input against XSS
    isValidInput: function(input, maxLength = 1000) {
      if (typeof input !== 'string') return false;
      if (input.length > maxLength) return false;
      
      // Check for potential XSS patterns
      const xssPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<iframe\b/gi,
        /<object\b/gi,
        /<embed\b/gi
      ];
      
      return !xssPatterns.some(pattern => pattern.test(input));
    },

    // Rate limiting
    createRateLimiter: function(maxRequests, windowMs) {
      const requests = [];
      
      return function() {
        const now = Date.now();
        
        // Remove old requests
        while (requests.length > 0 && requests[0] <= now - windowMs) {
          requests.shift();
        }
        
        if (requests.length >= maxRequests) {
          return false; // Rate limit exceeded
        }
        
        requests.push(now);
        return true; // Request allowed
      };
    }
  }
};

// Initialize advanced utilities
document.addEventListener('DOMContentLoaded', () => {
  console.log('🔧 HayDay Advanced Utilities loaded');
  
  // Store device info for debugging
  window.HayDayChat.deviceInfo = HayDayChat.AdvancedUtils.DeviceUtils.getDeviceInfo();
  window.HayDayChat.supportInfo = HayDayChat.AdvancedUtils.DeviceUtils.checkSupport();
});