/**
 * 🤖 HayDay Chat Loader - Site Entegrasyonu
 * Bu dosya her sayfaya eklenir ve floating chat button'u oluşturur
 * 
 * Kullanım: <script src="https://hayday-chat.onrender.com/assets/js/chat-loader.js" defer></script>
 */

(function() {
    'use strict';
    
    // Configuration
    const CHAT_CONFIG = {
        serverUrl: 'https://hayday-chat.onrender.com', // Production URL
        // serverUrl: 'http://localhost:3000', // Development URL
        buttonPosition: 'bottom-right', // bottom-right, bottom-left, top-right, top-left
        buttonSize: 'medium', // small, medium, large
        theme: 'auto', // light, dark, auto
        autoOpen: false, // Auto open chat after delay
        autoOpenDelay: 10000, // 10 seconds
        persistence: true, // Remember chat state across pages
        notificationSound: true,
        welcomeMessage: true,
        quickActions: true
    };

    // Chat Widget Class
    class HayDayChatWidget {
        constructor(config) {
            this.config = { ...CHAT_CONFIG, ...config };
            this.isOpen = false;
            this.unreadCount = 0;
            this.chatWindow = null;
            this.clientId = this.getOrCreateClientId();
            this.lastMessageTimestamp = 0;
            this.pollInterval = null;
            
            this.init();
        }

        init() {
            // Don't load if already exists
            if (document.querySelector('.hayday-chat-widget')) return;
            
            // Create widget elements
            this.createChatButton();
            this.createChatWindow();
            
            // Load persisted state
            if (this.config.persistence) {
                this.loadPersistedState();
            }
            
            // Start background polling
            this.startBackgroundPolling();
            
            // Auto open if configured
            if (this.config.autoOpen && !this.hasInteracted()) {
                setTimeout(() => {
                    if (!this.hasInteracted()) {
                        this.openChat();
                    }
                }, this.config.autoOpenDelay);
            }
            
            // Setup page visibility handling
            this.setupVisibilityHandler();
        }

        getOrCreateClientId() {
            let clientId = localStorage.getItem('hayday_chat_client_id');
            if (!clientId) {
                clientId = 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('hayday_chat_client_id', clientId);
            }
            return clientId;
        }

        createChatButton() {
            const button = document.createElement('div');
            button.className = 'hayday-chat-button';
            button.innerHTML = `
                <div class="chat-btn-content">
                    <div class="chat-btn-icon">💬</div>
                    <div class="chat-btn-text">Destek</div>
                    <div class="chat-btn-badge" id="chat-unread-badge" style="display: none;">0</div>
                </div>
                <div class="chat-btn-pulse"></div>
            `;
            
            // Add styles
            this.addChatButtonStyles();
            
            // Add click handler
            button.addEventListener('click', () => {
                this.toggleChat();
                this.markAsInteracted();
            });
            
            // Add to page
            document.body.appendChild(button);
        }

        addChatButtonStyles() {
            if (document.querySelector('#hayday-chat-button-styles')) return;
            
            const styles = document.createElement('style');
            styles.id = 'hayday-chat-button-styles';
            styles.textContent = `
                .hayday-chat-button {
                    position: fixed;
                    ${this.getButtonPosition()}
                    width: ${this.getButtonSize()};
                    height: ${this.getButtonSize()};
                    background: linear-gradient(135deg, #4CAF50, #45a049);
                    border-radius: 50%;
                    box-shadow: 0 4px 20px rgba(76, 175, 80, 0.4);
                    cursor: pointer;
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s ease;
                    user-select: none;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                
                .hayday-chat-button:hover {
                    transform: scale(1.1);
                    box-shadow: 0 6px 25px rgba(76, 175, 80, 0.5);
                }
                
                .chat-btn-content {
                    color: white;
                    text-align: center;
                    position: relative;
                }
                
                .chat-btn-icon {
                    font-size: ${this.getIconSize()};
                    line-height: 1;
                    margin-bottom: 2px;
                }
                
                .chat-btn-text {
                    font-size: ${this.getTextSize()};
                    font-weight: 600;
                    letter-spacing: 0.5px;
                }
                
                .chat-btn-badge {
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    background: #FF4444;
                    color: white;
                    border-radius: 10px;
                    padding: 2px 6px;
                    font-size: 10px;
                    font-weight: bold;
                    min-width: 16px;
                    height: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: bounce 2s infinite;
                }
                
                .chat-btn-pulse {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    border-radius: 50%;
                    background: rgba(76, 175, 80, 0.7);
                    animation: pulse 2s infinite;
                    pointer-events: none;
                }
                
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.1); opacity: 0.7; }
                    100% { transform: scale(1.2); opacity: 0; }
                }
                
                @keyframes bounce {
                    0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                    40% { transform: translateY(-3px); }
                    60% { transform: translateY(-2px); }
                }
                
                .hayday-chat-window {
                    position: fixed;
                    bottom: 100px;
                    right: 20px;
                    width: 380px;
                    height: 600px;
                    max-width: calc(100vw - 40px);
                    max-height: calc(100vh - 120px);
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
                    z-index: 9998;
                    display: none;
                    flex-direction: column;
                    overflow: hidden;
                    transform: scale(0.8) translateY(20px);
                    opacity: 0;
                    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                
                .hayday-chat-window.open {
                    display: flex;
                    transform: scale(1) translateY(0);
                    opacity: 1;
                }
                
                .chat-window-header {
                    background: linear-gradient(135deg, #4CAF50, #45a049);
                    color: white;
                    padding: 16px 20px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                
                .chat-header-info {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                
                .chat-avatar {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                }
                
                .chat-info h3 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: 600;
                }
                
                .chat-status {
                    font-size: 12px;
                    opacity: 0.9;
                }
                
                .chat-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 20px;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    transition: background 0.2s ease;
                }
                
                .chat-close:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
                
                .chat-window-body {
                    flex: 1;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }
                
                @media (max-width: 480px) {
                    .hayday-chat-window {
                        bottom: 80px;
                        right: 10px;
                        left: 10px;
                        width: auto;
                        height: calc(100vh - 100px);
                        max-height: none;
                        border-radius: 12px;
                    }
                    
                    .hayday-chat-button {
                        bottom: 15px;
                        right: 15px;
                    }
                }
            `;
            
            document.head.appendChild(styles);
        }

        getButtonPosition() {
            const positions = {
                'bottom-right': 'bottom: 20px; right: 20px;',
                'bottom-left': 'bottom: 20px; left: 20px;',
                'top-right': 'top: 20px; right: 20px;',
                'top-left': 'top: 20px; left: 20px;'
            };
            return positions[this.config.buttonPosition] || positions['bottom-right'];
        }

        getButtonSize() {
            const sizes = {
                'small': '50px',
                'medium': '60px', 
                'large': '70px'
            };
            return sizes[this.config.buttonSize] || sizes['medium'];
        }

        getIconSize() {
            const sizes = {
                'small': '18px',
                'medium': '20px',
                'large': '24px'
            };
            return sizes[this.config.buttonSize] || sizes['medium'];
        }

        getTextSize() {
            const sizes = {
                'small': '8px',
                'medium': '9px',
                'large': '10px'
            };
            return sizes[this.config.buttonSize] || sizes['medium'];
        }

        createChatWindow() {
            const chatWindow = document.createElement('div');
            chatWindow.className = 'hayday-chat-window';
            chatWindow.id = 'hayday-chat-window';
            
            chatWindow.innerHTML = `
                <div class="chat-window-header">
                    <div class="chat-header-info">
                        <div class="chat-avatar">🤖</div>
                        <div class="chat-info">
                            <h3>HayDay Destek</h3>
                            <div class="chat-status" id="chat-window-status">Çevrimiçi</div>
                        </div>
                    </div>
                    <button class="chat-close" onclick="hayDayChatWidget.closeChat()">×</button>
                </div>
                <div class="chat-window-body">
                    <iframe 
                        id="chat-iframe" 
                        src="${this.config.serverUrl}/index.html?embedded=true&clientId=${this.clientId}"
                        style="width: 100%; height: 100%; border: none; background: #fafafa;"
                        allow="microphone; camera"
                    ></iframe>
                </div>
            `;
            
            document.body.appendChild(chatWindow);
            this.chatWindow = chatWindow;
            
            // Setup iframe communication
            this.setupIframeMessaging();
        }

        setupIframeMessaging() {
            window.addEventListener('message', (event) => {
                if (event.origin !== this.config.serverUrl) return;
                
                const { type, data } = event.data;
                
                switch (type) {
                    case 'chat_ready':
                        this.onChatReady();
                        break;
                    case 'new_message':
                        this.onNewMessage(data);
                        break;
                    case 'unread_count':
                        this.updateUnreadCount(data.count);
                        break;
                    case 'chat_close':
                        this.closeChat();
                        break;
                }
            });
        }

        onChatReady() {
            console.log('HayDay Chat ready');
            
            // Send configuration to iframe
            this.sendToIframe('config', {
                clientId: this.clientId,
                embedded: true,
                config: this.config
            });
        }

        onNewMessage(messageData) {
            if (!this.isOpen && this.config.notificationSound) {
                this.playNotificationSound();
            }
            
            // Update unread count if chat is closed
            if (!this.isOpen && messageData.role !== 'user') {
                this.unreadCount++;
                this.updateUnreadBadge();
            }
        }

        sendToIframe(type, data) {
            const iframe = document.getElementById('chat-iframe');
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage({ type, data }, this.config.serverUrl);
            }
        }

        toggleChat() {
            if (this.isOpen) {
                this.closeChat();
            } else {
                this.openChat();
            }
        }

        openChat() {
            if (this.isOpen) return;
            
            this.isOpen = true;
            this.chatWindow.classList.add('open');
            
            // Clear unread count
            this.unreadCount = 0;
            this.updateUnreadBadge();
            
            // Save state
            if (this.config.persistence) {
                localStorage.setItem('hayday_chat_open', 'true');
            }
            
            // Focus iframe
            setTimeout(() => {
                const iframe = document.getElementById('chat-iframe');
                if (iframe) {
                    iframe.focus();
                }
            }, 300);
        }

        closeChat() {
            if (!this.isOpen) return;
            
            this.isOpen = false;
            this.chatWindow.classList.remove('open');
            
            // Save state
            if (this.config.persistence) {
                localStorage.setItem('hayday_chat_open', 'false');
            }
        }

        updateUnreadCount(count) {
            this.unreadCount = count;
            this.updateUnreadBadge();
        }

        updateUnreadBadge() {
            const badge = document.getElementById('chat-unread-badge');
            if (badge) {
                if (this.unreadCount > 0) {
                    badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
                    badge.style.display = 'flex';
                } else {
                    badge.style.display = 'none';
                }
            }
        }

        startBackgroundPolling() {
            // Only poll when chat is closed to check for new messages
            this.pollInterval = setInterval(async () => {
                if (!this.isOpen) {
                    try {
                        const response = await fetch(`${this.config.serverUrl}/api/chat/poll/${this.clientId}?after=${this.lastMessageTimestamp}`);
                        const data = await response.json();
                        
                        if (response.ok && data.newMessages && data.newMessages.length > 0) {
                            // Count new non-user messages
                            const newBotMessages = data.newMessages.filter(m => m.role !== 'user');
                            if (newBotMessages.length > 0) {
                                this.unreadCount += newBotMessages.length;
                                this.updateUnreadBadge();
                                
                                if (this.config.notificationSound) {
                                    this.playNotificationSound();
                                }
                            }
                            
                            this.lastMessageTimestamp = data.lastTimestamp;
                        }
                    } catch (error) {
                        console.error('Background polling error:', error);
                    }
                }
            }, 30000); // Check every 30 seconds
        }

        playNotificationSound() {
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = 800;
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.1);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.3);
            } catch (error) {
                console.log('Notification sound not available:', error);
            }
        }

        loadPersistedState() {
            const wasOpen = localStorage.getItem('hayday_chat_open') === 'true';
            if (wasOpen) {
                setTimeout(() => this.openChat(), 1000);
            }
        }

        markAsInteracted() {
            localStorage.setItem('hayday_chat_interacted', 'true');
        }

        hasInteracted() {
            return localStorage.getItem('hayday_chat_interacted') === 'true';
        }

        setupVisibilityHandler() {
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    // Page is hidden - reduce polling frequency
                    if (this.pollInterval) {
                        clearInterval(this.pollInterval);
                        this.pollInterval = setInterval(() => {
                            if (!this.isOpen) this.checkForNewMessages();
                        }, 60000); // 1 minute when hidden
                    }
                } else {
                    // Page is visible - restore normal polling
                    if (this.pollInterval) {
                        clearInterval(this.pollInterval);
                        this.startBackgroundPolling();
                    }
                }
            });
        }

        async checkForNewMessages() {
            try {
                const response = await fetch(`${this.config.serverUrl}/api/chat/poll/${this.clientId}?after=${this.lastMessageTimestamp}`);
                const data = await response.json();
                
                if (response.ok && data.newMessages && data.newMessages.length > 0) {
                    const newBotMessages = data.newMessages.filter(m => m.role !== 'user');
                    if (newBotMessages.length > 0) {
                        this.unreadCount += newBotMessages.length;
                        this.updateUnreadBadge();
                    }
                    this.lastMessageTimestamp = data.lastTimestamp;
                }
            } catch (error) {
                console.error('Check messages error:', error);
            }
        }

        destroy() {
            if (this.pollInterval) {
                clearInterval(this.pollInterval);
            }
            
            const button = document.querySelector('.hayday-chat-button');
            const window = document.querySelector('.hayday-chat-window');
            const styles = document.querySelector('#hayday-chat-button-styles');
            
            if (button) button.remove();
            if (window) window.remove();
            if (styles) styles.remove();
        }
    }

    // Initialize widget when DOM is ready
    function initializeWidget() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                window.hayDayChatWidget = new HayDayChatWidget();
            });
        } else {
            window.hayDayChatWidget = new HayDayChatWidget();
        }
    }

    // Global functions for HTML
    window.openHayDayChat = function() {
        if (window.hayDayChatWidget) {
            window.hayDayChatWidget.openChat();
        }
    };

    window.closeHayDayChat = function() {
        if (window.hayDayChatWidget) {
            window.hayDayChatWidget.closeChat();
        }
    };

    window.toggleHayDayChat = function() {
        if (window.hayDayChatWidget) {
            window.hayDayChatWidget.toggleChat();
        }
    };

    // Initialize
    initializeWidget();

    // Debug mode
    if (window.location.search.includes('debug=chat')) {
        window.hayDayChat = {
            widget: window.hayDayChatWidget,
            config: CHAT_CONFIG,
            version: '1.0.0'
        };
        console.log('🤖 HayDay Chat Widget loaded - Debug mode active');
    }

})();
