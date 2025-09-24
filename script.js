/**
 * 🔧 HayDay Chat System - Shared Utilities (UTF-8 Fixed)
 * Common functions used across the application
 */

// Global namespace for HayDay Chat
window.HayDayChat = window.HayDayChat || {};

/**
 * 🛠️ Utility Functions
 */
const Utils = {
  // Generate unique ID
  generateId: (prefix = 'id') => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  // Format timestamp to readable time
  formatTime: (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('tr-TR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  },

  // Format date to readable format  
  formatDate: (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Bugün';  // Fixed: was 'Bugรผn'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Dün';    // Fixed: was 'Dรผn' 
    } else {
      return date.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  },

  // Debounce function
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Throttle function
  throttle: (func, limit) => {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Check if device is mobile
  isMobile: () => {
    return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },

  // Check if device is iOS
  isIOS: () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  },

  // Sanitize HTML to prevent XSS
  sanitizeHtml: (str) => {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
  },

  // Convert URLs to clickable links
  linkify: (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  },

  // Simple emoji conversion
  emojify: (text) => {
    const emojiMap = {
      ':)': '😊',
      ':-)': '😊',
      ':(': '😔',
      ':-(': '😔',
      ':D': '😃',
      ':-D': '😃',
      ';)': '😉',
      ';-)': '😉',
      ':P': '😛',
      ':-P': '😛',
      ':o': '😮',
      ':-o': '😮',
      '<3': '❤️',
      '</3': '💔'
    };

    let result = text;
    Object.keys(emojiMap).forEach(emoticon => {
      const regex = new RegExp(emoticon.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      result = result.replace(regex, emojiMap[emoticon]);
    });

    return result;
  },

  // Copy text to clipboard
  copyToClipboard: async (text) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const result = document.execCommand('copy');
        textArea.remove();
        return result;
      }
    } catch (error) {
      console.error('Copy failed:', error);
      return false;
    }
  },

  // Show toast notification
  showToast: (message, type = 'info', duration = 3000) => {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast-notification');
    existingToasts.forEach(toast => toast.remove());

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4CAF50' : '#2196F3'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-size: 14px;
      font-weight: 500;
      max-width: 300px;
      word-wrap: break-word;
      animation: slideIn 0.3s ease;
    `;

    // Add slide-in animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    toast.textContent = message;
    document.body.appendChild(toast);

    // Auto remove
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 300);
    }, duration);

    return toast;
  }
};

/**
 * 🎨 Animation Helpers
 */
const Animations = {
  // Smooth scroll to element
  scrollTo: (element, duration = 300) => {
    const start = element.scrollTop;
    const target = element.scrollHeight - element.clientHeight;
    const change = target - start;
    const startTime = performance.now();

    function animateScroll(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      element.scrollTop = start + (change * easeOut);

      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    }

    requestAnimationFrame(animateScroll);
  },

  // Fade in element
  fadeIn: (element, duration = 300) => {
    element.style.opacity = '0';
    element.style.display = 'block';
    
    let start = null;
    function animate(timestamp) {
      if (!start) start = timestamp;
      const progress = timestamp - start;
      
      element.style.opacity = Math.min(progress / duration, 1);
      
      if (progress < duration) {
        requestAnimationFrame(animate);
      }
    }
    
    requestAnimationFrame(animate);
  },

  // Fade out element
  fadeOut: (element, duration = 300) => {
    let start = null;
    function animate(timestamp) {
      if (!start) start = timestamp;
      const progress = timestamp - start;
      
      element.style.opacity = Math.max(1 - (progress / duration), 0);
      
      if (progress < duration) {
        requestAnimationFrame(animate);
      } else {
        element.style.display = 'none';
      }
    }
    
    requestAnimationFrame(animate);
  },

  // Bounce animation
  bounce: (element) => {
    element.style.animation = 'bounce 0.6s ease';
    setTimeout(() => {
      element.style.animation = '';
    }, 600);
  }
};

/**
 * 🔄 API Helper Functions
 */
const API = {
  // Base API URL
  baseURL: window.location.origin,

  // Generic fetch wrapper
  request: async (endpoint, options = {}) => {
    const url = `${API.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  },

  // GET request
  get: (endpoint, headers = {}) => {
    return API.request(endpoint, { method: 'GET', headers });
  },

  // POST request
  post: (endpoint, data = {}, headers = {}) => {
    return API.request(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
  },

  // Health check
  ping: async () => {
    try {
      const response = await API.get('/ping');
      return response.ok;
    } catch {
      return false;
    }
  }
};

/**
 * 💾 Storage Helpers
 */
const Storage = {
  // Get from localStorage with fallback
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  // Set to localStorage
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  // Remove from localStorage
  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },

  // Clear all localStorage
  clear: () => {
    try {
      localStorage.clear();
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * 🎯 Event Management
 */
const EventBus = {
  events: {},

  // Subscribe to event
  on: (event, callback) => {
    if (!EventBus.events[event]) {
      EventBus.events[event] = [];
    }
    EventBus.events[event].push(callback);
  },

  // Unsubscribe from event
  off: (event, callback) => {
    if (EventBus.events[event]) {
      EventBus.events[event] = EventBus.events[event].filter(cb => cb !== callback);
    }
  },

  // Emit event
  emit: (event, data) => {
    if (EventBus.events[event]) {
      EventBus.events[event].forEach(callback => callback(data));
    }
  }
};

/**
 * 🔧 Form Validation
 */
const Validator = {
  // Validate email
  email: (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },

  // Validate phone (Turkish format)
  phone: (phone) => {
    const regex = /^(\+90|0)?[1-9][0-9]{9}$/;
    return regex.test(phone.replace(/\s/g, ''));
  },

  // Validate required field
  required: (value) => {
    return value !== null && value !== undefined && value.toString().trim().length > 0;
  },

  // Validate min length
  minLength: (value, min) => {
    return value && value.toString().length >= min;
  },

  // Validate max length
  maxLength: (value, max) => {
    return !value || value.toString().length <= max;
  },

  // Validate numeric
  numeric: (value) => {
    return !isNaN(value) && !isNaN(parseFloat(value));
  }
};

/**
 * 🎮 Keyboard Shortcuts
 */
const Shortcuts = {
  handlers: {},

  // Register shortcut
  register: (key, callback, description = '') => {
    Shortcuts.handlers[key] = { callback, description };
  },

  // Handle keydown event
  handleKeydown: (event) => {
    const key = [];
    
    if (event.ctrlKey) key.push('ctrl');
    if (event.altKey) key.push('alt');
    if (event.shiftKey) key.push('shift');
    if (event.metaKey) key.push('cmd');
    
    key.push(event.key.toLowerCase());
    
    const keyString = key.join('+');
    
    if (Shortcuts.handlers[keyString]) {
      event.preventDefault();
      Shortcuts.handlers[keyString].callback(event);
    }
  },

  // Initialize shortcuts
  init: () => {
    document.addEventListener('keydown', Shortcuts.handleKeydown);
  }
};

/**
 * 🔍 Search Utilities
 */
const Search = {
  // Highlight search terms in text
  highlight: (text, searchTerm) => {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  },

  // Simple fuzzy search
  fuzzyMatch: (text, searchTerm) => {
    if (!searchTerm) return true;
    
    const textLower = text.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    let textIndex = 0;
    let searchIndex = 0;
    
    while (textIndex < textLower.length && searchIndex < searchLower.length) {
      if (textLower[textIndex] === searchLower[searchIndex]) {
        searchIndex++;
      }
      textIndex++;
    }
    
    return searchIndex === searchLower.length;
  }
};

/**
 * 🚀 Performance Monitoring
 */
const Performance = {
  marks: {},

  // Start performance mark
  mark: (name) => {
    Performance.marks[name] = performance.now();
  },

  // Measure performance
  measure: (name) => {
    if (Performance.marks[name]) {
      const duration = performance.now() - Performance.marks[name];
      console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
      delete Performance.marks[name];
      return duration;
    }
    return 0;
  }
};

// Export utilities to global namespace
Object.assign(window.HayDayChat, {
  Utils,
  Animations,
  API,
  Storage,
  EventBus,
  Validator,
  Shortcuts,
  Search,
  Performance
});

// Initialize shortcuts on load
document.addEventListener('DOMContentLoaded', () => {
  Shortcuts.init();
  
  // Register common shortcuts
  Shortcuts.register('escape', () => {
    // Close modals, clear search, etc.
    const searchInput = document.querySelector('.search-input');
    if (searchInput && searchInput.value) {
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input'));
    }
  }, 'Clear search or close modals');
});

// Console welcome message
console.log(`
🤖 HayDay Chat System Loaded
╭─────────────────────────────╮
│  Utilities: HayDayChat.Utils  │
│  API: HayDayChat.API          │
│  Storage: HayDayChat.Storage  │
│  Events: HayDayChat.EventBus  │
╰─────────────────────────────╯
`);

// Health check on load
window.addEventListener('load', async () => {
  const isHealthy = await API.ping();
  if (!isHealthy) {
    Utils.showToast('Sunucuya bağlanılamadı', 'error', 5000);
  }
});